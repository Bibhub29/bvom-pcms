import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { SectionService } from '../../core/services/section.service';
import { Router } from '@angular/router';
import { CourseService } from '../../core/services/course.service';
import { forkJoin, of, Observable } from 'rxjs';
import { DraftService, SectionDraftRecord } from '../../core/services/draft.service';
import { CourseStatus } from '../../core/services/course.service';

interface Course {
  id: number;
  name: string;
  iconUrl: string;
  commonDraft: string;
  backendId?: string;
  iconFailed?: boolean;
  status: CourseStatus;
}

interface SectionDraft {
  id: number;
  name: string;
  content: string;
  backendId?: string;
}

interface Section {
  id: string;
  name: string;
  status: CourseStatus;
  courses: Course[];
  drafts: SectionDraft[];
}

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './section-editor.component.html',
  styleUrl: './section-editor.component.css'
})
export class SectionEditorComponent {
  sectionId: string | null = null;
  sectionName = '';
  originalSectionName = '';
  editingSectionName = false;
  courses: Course[] = [];
  sectionDrafts: SectionDraft[] = [];
  existingSections: Section[] = [];
  private originalCourseIds: string[] = [];
  private originalCourseValues = new Map<string, string>();

  showCommonDraftModal = false;
  showDraftModal = false;
  showDeleteModal = false;
  editingExistingSection: Section | null = null;
  sectionEditTarget: Section | null = null;
  showSectionEditModal = false;
  sectionNameDraft = '';
  sectionStatusDraft: CourseStatus = 'pending';

  activeCourseId: number | null = null;
  editingDraftId: number | null = null;

  commonDraftText = '';
  draftName = '';
  draftContent = '';

  draggedSectionId: string | null = null;
  dragOverSectionId: string | null = null;
  nextCourseId = 1;
  nextDraftId = 1;

  // Search & pagination
  pageSize = 4;
  sectionSearch = '';
  draftSearch = '';
  sectionPage = 1;
  draftPage = 1;

  constructor(
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private sectionsApi: SectionService,
    private router: Router,
    private coursesApi: CourseService,
    private draftsApi: DraftService
  ) {
    this.sectionId = this.route.snapshot.paramMap.get('id');
    this.loadExistingSections();

    if (this.sectionId) {
      this.sectionsApi.get(this.sectionId).subscribe({
        next: response => { this.sectionName = response.data.name; this.originalSectionName = response.data.name; },
        error: () => this.toastr.error('Could not load section.', 'Loading failed')
      });
      this.coursesApi.list(this.sectionId).subscribe({
        next: response => {
          this.courses = response.data.map((course, index) => ({ id: index + 1, backendId: course._id, name: course.name, iconUrl: course.iconUrl ?? '', commonDraft: course.commonDraft ?? '', status: course.status ?? 'pending' }));
          this.setCourseBaseline();
          this.nextCourseId = this.courses.length + 1;
        },
        error: () => this.toastr.error('Could not load section courses.', 'Loading failed')
      });
      this.loadSectionDrafts(this.sectionId);
    } else {
      this.addCourse();
    }
  }

  private loadExistingSections(): void {
    this.sectionsApi.list().subscribe({
      next: response => {
        if (!response.data.length) {
          this.existingSections = [];
          return;
        }
        forkJoin(response.data.map(section => forkJoin([
          this.coursesApi.list(section._id),
          this.draftsApi.listSection(section._id)
        ]))).subscribe({
          next: records => {
            this.existingSections = response.data.map((section, index) => ({
              id: section._id,
              name: section.name,
              status: section.status ?? 'pending',
              courses: records[index][0].data.map((course, courseIndex) => ({
                id: courseIndex + 1,
                backendId: course._id,
                name: course.name,
                iconUrl: course.iconUrl ?? '',
                commonDraft: course.commonDraft ?? '',
                status: course.status ?? 'pending'
              })),
              drafts: records[index][1].data.map((draft, draftIndex) => ({
                id: draftIndex + 1,
                backendId: draft._id,
                name: draft.draftName,
                content: draft.content
              }))
            }));
          },
          error: () => this.toastr.error('Could not load section details.', 'Loading failed')
        });
      },
      error: () => this.toastr.error('Could not load existing sections.', 'Loading failed')
    });
  }

  private loadSectionDrafts(sectionId: string): void {
    this.draftsApi.listSection(sectionId).subscribe({
      next: response => {
        this.sectionDrafts = response.data.map((draft, index) => ({
          id: index + 1,
          backendId: draft._id,
          name: draft.draftName,
          content: draft.content
        }));
        this.nextDraftId = this.sectionDrafts.length + 1;
      },
      error: () => this.toastr.error('Could not load section notes and drafts.', 'Loading failed')
    });
  }

  private courseValue(course: Course): string {
    return JSON.stringify({ name: course.name.trim(), iconUrl: course.iconUrl.trim(), commonDraft: course.commonDraft, status: course.status });
  }

  private setCourseBaseline(): void {
    this.originalCourseIds = this.courses.flatMap(course => course.backendId ? [course.backendId] : []);
    this.originalCourseValues = new Map(this.courses.flatMap(course => course.backendId ? [[course.backendId, this.courseValue(course)] as [string, string]] : []));
  }

  get hasUnsavedChanges(): boolean {
    const hasPendingDrafts = this.sectionDrafts.some(draft => !draft.backendId);

    if (!this.sectionId) {
      return !!this.sectionName.trim()
        || this.courses.some(course => !!course.name.trim() || !!course.iconUrl.trim() || !!course.commonDraft.trim() || course.status !== 'pending')
        || hasPendingDrafts;
    }

    const activeCourses = this.courses.filter(course => course.name.trim());
    const activeBackendIds = new Set(activeCourses.flatMap(course => course.backendId ? [course.backendId] : []));
    const hasRemovedCourses = this.originalCourseIds.some(id => !activeBackendIds.has(id));
    const hasChangedCourses = activeCourses.some(course =>
      !course.backendId || this.originalCourseValues.get(course.backendId) !== this.courseValue(course)
    );

    return this.sectionName.trim() !== this.originalSectionName
      || hasRemovedCourses
      || hasChangedCourses
      || hasPendingDrafts;
  }

  // --- STATS GETTERS ---
  get totalCourses() { return this.courses.length; }
  get coursesWithCommonDraft() { return this.courses.filter(c => !!c.commonDraft.trim()).length; }
  get coursesWithIcon() { return this.courses.filter(c => !!c.iconUrl.trim()).length; }
  get pendingCourses() { return this.courses.filter(course => course.status === 'pending').length; }
  get inProgressCourses() { return this.courses.filter(course => course.status === 'in-progress').length; }
  get completedCourses() { return this.courses.filter(course => course.status === 'completed').length; }
  get draftsWithContent() { return this.sectionDrafts.filter(d => !!d.content.trim()).length; }

  get coursesPercent() { return this.totalCourses ? 100 : 0; }
  get commonDraftPercent() { return this.percentOf(this.coursesWithCommonDraft, this.totalCourses); }
  get iconPercent() { return this.percentOf(this.coursesWithIcon, this.totalCourses); }
  get draftFilledPercent() { return this.percentOf(this.draftsWithContent, this.sectionDrafts.length); }

  percentOf(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  // --- FILTERING & PAGINATION ---
  get filteredSections() {
    const search = this.sectionSearch.trim().toLowerCase();
    return this.existingSections.filter(s => !search || s.name.toLowerCase().includes(search));
  }

  get filteredDrafts() {
    const search = this.draftSearch.trim().toLowerCase();
    return this.sectionDrafts.filter(d =>
      !search || d.name.toLowerCase().includes(search) || d.content.toLowerCase().includes(search)
    );
  }

  sectionStatus(section: Section): CourseStatus {
    return section.status;
  }

  get totalSectionPages() { return Math.max(1, Math.ceil(this.filteredSections.length / this.pageSize)); }
  get totalDraftPages() { return Math.max(1, Math.ceil(this.filteredDrafts.length / this.pageSize)); }

  get paginatedSections() {
    const start = (this.sectionPage - 1) * this.pageSize;
    return this.filteredSections.slice(start, start + this.pageSize);
  }

  get paginatedDrafts() {
    const start = (this.draftPage - 1) * this.pageSize;
    return this.filteredDrafts.slice(start, start + this.pageSize);
  }

  /** Real position of a section in the full list (stays correct across pages and filters) */
  sectionPosition(section: Section): number {
    return this.existingSections.findIndex(item => item.id === section.id) + 1;
  }

  /** Up to 5 page numbers around the current page */
  getVisiblePages(current: number, total: number): number[] {
    const size = 5;
    let end = Math.min(total, Math.max(1, current - 2) + size - 1);
    const start = Math.max(1, end - size + 1);
    end = Math.min(total, start + size - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  changeSectionPage(page: number) {
    if (page >= 1 && page <= this.totalSectionPages) this.sectionPage = page;
  }

  changeDraftPage(page: number) {
    if (page >= 1 && page <= this.totalDraftPages) this.draftPage = page;
  }

  // --- COURSES ---
  addCourse(): void {
    this.courses.push({
      id: this.nextCourseId++,
      name: '',
      iconUrl: '',
      commonDraft: '',
      status: 'pending'
    });
  }

  removeCourse(courseId: number): void {
    this.courses = this.courses.filter(item => item.id !== courseId);
  }

  onIconUrlChange(course: Course, url: string): void {
    course.iconUrl = url;
    course.iconFailed = false;
  }

  onCourseIconError(course: Course): void {
    // Keep what the user typed; just show the fallback icon and a hint
    course.iconFailed = true;
  }

  // --- COMMON DRAFT ---
  openCommonDraft(course: Course): void {
    this.activeCourseId = course.id;
    this.commonDraftText = course.commonDraft;
    this.showCommonDraftModal = true;
  }

  saveCommonDraft(): void {
    const course = this.courses.find(item => item.id === this.activeCourseId);

    if (!course) {
      this.closeCommonDraft();
      return;
    }

    const commonDraft = this.commonDraftText.trim();
    if (course.backendId) {
      this.coursesApi.update(course.backendId, { name: course.name.trim(), commonDraft }).subscribe({
        next: () => {
          course.commonDraft = commonDraft;
          const baseline = this.originalCourseValues.get(course.backendId!);
          if (baseline) {
            const savedValues = JSON.parse(baseline) as { name: string; iconUrl: string; commonDraft: string; status: CourseStatus };
            savedValues.name = course.name.trim();
            savedValues.commonDraft = commonDraft;
            this.originalCourseValues.set(course.backendId!, JSON.stringify(savedValues));
          }
          this.closeCommonDraft();
          this.toastr.success('Common draft saved for this course.', 'Saved');
          this.loadExistingSections();
        },
        error: error => this.toastr.error(error.error?.message ?? 'Could not save the common draft.', 'Save failed')
      });
      return;
    }

    course.commonDraft = commonDraft;
    this.closeCommonDraft();
    this.toastr.success('Common draft saved. Save the section to apply it to this course.', 'Saved');
  }

  closeCommonDraft(): void {
    this.showCommonDraftModal = false;
    this.activeCourseId = null;
  }

  // --- SECTION DRAFTS ---
  openAddDraft(): void {
    this.editingDraftId = null;
    this.draftName = '';
    this.draftContent = '';
    this.showDraftModal = true;
  }

  openEditDraft(draft: SectionDraft): void {
    this.editingDraftId = draft.id;
    this.draftName = draft.name;
    this.draftContent = draft.content;
    this.showDraftModal = true;
  }

  saveSectionDraft(): void {
    const name = this.draftName.trim();

    if (!name) {
      this.toastr.error('Please enter a draft name.', 'Validation Error');
      return;
    }

    const existingDraft = this.editingDraftId === null ? undefined : this.sectionDrafts.find(item => item.id === this.editingDraftId);
    const data = { draftName: name, content: this.draftContent };
    const request = existingDraft?.backendId
      ? this.draftsApi.update(existingDraft.backendId, data)
      : this.sectionId
        ? this.draftsApi.createSection(this.sectionId, { ...data, draftOrder: this.sectionDrafts.length + 1 })
        : null;

    if (!request) {
      if (existingDraft) {
        existingDraft.name = name;
        existingDraft.content = this.draftContent;
      } else {
        this.sectionDrafts.push({ id: this.nextDraftId++, name, content: this.draftContent });
      }
      this.closeDraftModal();
      this.toastr.success(this.sectionId ? 'Draft saved.' : 'Draft added. Save the section to store it.', 'Saved');
      return;
    }

    request.subscribe({
      next: response => {
        if (existingDraft) {
          existingDraft.name = name;
          existingDraft.content = this.draftContent;
        } else {
          this.sectionDrafts.push({ id: this.nextDraftId++, backendId: response.data._id, name, content: this.draftContent });
        }
        this.showDraftModal = false;
        this.toastr.success('Draft saved successfully.', 'Saved');
        this.loadExistingSections();
      },
      error: error => this.toastr.error(error.error?.message ?? 'Could not save the section draft.', 'Save failed')
    });
  }

  closeDraftModal(): void {
    this.showDraftModal = false;
    this.editingDraftId = null;
  }

  deleteSectionDraft(draftId: number): void {
    const draft = this.sectionDrafts.find(item => item.id === draftId);
    if (!draft) return;
    const removeFromView = () => {
      this.sectionDrafts = this.sectionDrafts.filter(item => item.id !== draftId);
      this.draftPage = Math.min(this.draftPage, this.totalDraftPages);
      this.toastr.info('Draft deleted.', 'Removed');
      this.loadExistingSections();
    };
    if (!draft.backendId) {
      removeFromView();
      return;
    }
    this.draftsApi.remove(draft.backendId).subscribe({
      next: removeFromView,
      error: error => this.toastr.error(error.error?.message ?? 'Could not delete the section draft.', 'Delete failed')
    });
  }

  async copySectionDraft(draft: SectionDraft): Promise<void> {
    if (!draft.content) {
      this.toastr.warning('Nothing to copy.', 'Empty');
      return;
    }

    try {
      await navigator.clipboard.writeText(draft.content);
      this.toastr.success('Draft content copied.', 'Copied');
    } catch {
      // Fallback for contexts where the Clipboard API is blocked
      const area = document.createElement('textarea');
      area.value = draft.content;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      ok
        ? this.toastr.success('Draft content copied.', 'Copied')
        : this.toastr.error('Could not copy the draft. Please copy it manually.', 'Copy Failed');
    }
  }

  // --- DRAG & DROP (sections) ---
  onSectionDragStart(sectionId: string, event: DragEvent): void {
    this.draggedSectionId = sectionId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', sectionId);
    }
  }

  onSectionDragOver(sectionId: string, event: DragEvent): void {
    event.preventDefault();
    this.dragOverSectionId = sectionId;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onSectionDragEnd(): void {
    this.draggedSectionId = null;
    this.dragOverSectionId = null;
  }

  onSectionDrop(targetSectionId: string, event: DragEvent): void {
    event.preventDefault();
    if (this.draggedSectionId === null || this.draggedSectionId === targetSectionId) {
      this.onSectionDragEnd();
      return;
    }

    const previousOrder = [...this.existingSections];
    const fromIndex = this.existingSections.findIndex(section => section.id === this.draggedSectionId);
    const toIndex = this.existingSections.findIndex(section => section.id === targetSectionId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [section] = this.existingSections.splice(fromIndex, 1);
      this.existingSections.splice(toIndex, 0, section);
      this.sectionsApi.reorder(this.existingSections.map((item, index) => ({ id: item.id, order: index }))).subscribe({
        next: () => this.toastr.success('Section order saved.', 'Reordered'),
        error: error => {
          this.existingSections = previousOrder;
          this.toastr.error(error.error?.message ?? 'Could not save section order.', 'Reorder failed');
        }
      });
    }

    this.onSectionDragEnd();
  }

  updateExistingCourseStatus(section: Section, course: Course, status: CourseStatus): void {
    if (!['pending', 'in-progress', 'completed'].includes(status)) return;
    const previousStatus = course.status;
    course.status = status;
    const activeCourse = section.id === this.sectionId
      ? this.courses.find(item => item.backendId === course.backendId)
      : undefined;
    if (activeCourse) activeCourse.status = status;
    if (!course.backendId) return;
    this.coursesApi.update(course.backendId, { status }).subscribe({
      next: () => {
        if (activeCourse?.backendId) this.originalCourseValues.set(activeCourse.backendId, this.courseValue(activeCourse));
      },
      error: error => {
        course.status = previousStatus;
        if (activeCourse) activeCourse.status = previousStatus;
        this.toastr.error(error.error?.message ?? 'Could not update course status.', 'Update failed');
      }
    });
  }

  openExistingSectionEdit(section: Section): void {
    this.sectionId = section.id;
    this.sectionName = section.name;
    this.originalSectionName = section.name;
    this.editingSectionName = false;
    this.courses = section.courses.map(course => ({ ...course }));
    this.setCourseBaseline();
    this.nextCourseId = Math.max(0, ...this.courses.map(course => course.id)) + 1;
    this.sectionDrafts = section.drafts.map(draft => ({ ...draft }));
    this.nextDraftId = Math.max(0, ...this.sectionDrafts.map(draft => draft.id)) + 1;
    this.router.navigate(['/sections', section.id, 'edit']);
  }

  openSectionDetailsEdit(section: Section): void {
    this.sectionEditTarget = section;
    this.sectionNameDraft = section.name;
    this.sectionStatusDraft = section.status;
    this.showSectionEditModal = true;
  }

  closeSectionDetailsEdit(): void {
    this.showSectionEditModal = false;
    this.sectionEditTarget = null;
  }

  saveSectionDetails(): void {
    const section = this.sectionEditTarget;
    const name = this.sectionNameDraft.trim();
    if (!section) return;
    if (!name) {
      this.toastr.error('Please enter a section name.', 'Validation Error');
      return;
    }

    this.sectionsApi.update(section.id, { name, status: this.sectionStatusDraft }).subscribe({
      next: response => {
        section.name = response.data.name;
        section.status = response.data.status ?? this.sectionStatusDraft;
        if (this.sectionId === section.id) {
          this.sectionName = section.name;
          this.originalSectionName = section.name;
        }
        this.closeSectionDetailsEdit();
        this.toastr.success('Section name and status updated.', 'Saved');
      },
      error: error => this.toastr.error(error.error?.message ?? 'Could not update this section.', 'Update failed')
    });
  }

  addExistingSectionCourse(): void {
    if (!this.editingExistingSection) return;

    this.editingExistingSection.courses.push({
      id: this.nextCourseId++,
      name: '',
      iconUrl: '',
      commonDraft: '',
      status: 'pending'
    });
  }

  removeExistingSectionCourse(courseId: number): void {
    if (!this.editingExistingSection) return;
    this.editingExistingSection.courses = this.editingExistingSection.courses
      .filter(course => course.id !== courseId);
  }

  addExistingSectionDraft(): void {
    if (!this.editingExistingSection) return;

    this.editingExistingSection.drafts.push({
      id: this.nextDraftId++,
      name: '',
      content: ''
    });
  }

  removeExistingSectionDraft(draftId: number): void {
    if (!this.editingExistingSection) return;
    this.editingExistingSection.drafts = this.editingExistingSection.drafts
      .filter(draft => draft.id !== draftId);
  }

  saveExistingSectionEdit(): void {
    const editedSection = this.editingExistingSection;
    if (!editedSection) return;

    const name = editedSection.name.trim();
    if (!name) {
      this.toastr.error('Please enter a section name.', 'Validation Error');
      return;
    }

    if (editedSection.courses.some(course => !course.name.trim())) {
      this.toastr.error('Please enter a name for each course.', 'Validation Error');
      return;
    }

    if (editedSection.drafts.some(draft => !draft.name.trim())) {
      this.toastr.error('Please enter a name for each draft.', 'Validation Error');
      return;
    }

    const index = this.existingSections.findIndex(section => section.id === editedSection.id);
    if (index === -1) {
      this.editingExistingSection = null;
      return;
    }

    this.existingSections[index] = {
      ...editedSection,
      name,
      courses: editedSection.courses.map(course => ({ ...course, name: course.name.trim() })),
      drafts: editedSection.drafts.map(draft => ({ ...draft, name: draft.name.trim() }))
    };
    this.editingExistingSection = null;
    this.toastr.success('Section updated successfully.', 'Saved');
  }

  // --- SAVE / DELETE SECTION ---
  saveSection(): void {
    const name = this.sectionName.trim();
    if (!name) {
      this.toastr.error('Please enter a section name.', 'Validation Error');
      return;
    }
    const activeCourses = this.courses.filter(course => course.name.trim());
    const names = activeCourses.map(course => course.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      this.toastr.error('Course names must be unique within this section.', 'Validation Error');
      return;
    }

    if (!this.sectionId) {
      this.spinner.show();
      this.sectionsApi.create({ name }).subscribe({
        next: response => {
          this.sectionId = response.data._id;
          this.router.navigate(['/sections', response.data._id], { replaceUrl: true });
          this.originalSectionName = response.data.name;
          this.editingSectionName = false;
          const sectionId = response.data._id;
          const saves = activeCourses.map(course => this.coursesApi.create({
            sectionId, name: course.name.trim(), iconUrl: course.iconUrl, commonDraft: course.commonDraft, status: course.status
          }));
          if (saves.length) {
            forkJoin(saves).subscribe({
              next: created => {
                this.courses = created.map((item, index) => ({ id: index + 1, backendId: item.data._id, name: item.data.name, iconUrl: item.data.iconUrl ?? '', commonDraft: item.data.commonDraft ?? '', status: item.data.status ?? 'pending' }));
                this.setCourseBaseline();
                this.savePendingDrafts(sectionId);
              },
              error: error => { this.spinner.hide(); this.toastr.error(error.error?.message ?? 'Section was created, but some courses could not be saved.', 'Save failed'); this.loadExistingSections(); }
            });
          } else {
            this.courses = [];
            this.setCourseBaseline();
            this.savePendingDrafts(sectionId);
          }
        },
        error: error => { this.spinner.hide(); this.toastr.error(error.error?.message ?? 'Could not create section.', 'Save failed'); }
      });
      return;
    }

    const activeBackendIds = new Set(activeCourses.flatMap(course => course.backendId ? [course.backendId] : []));
    const removals = this.originalCourseIds.filter(id => !activeBackendIds.has(id)).map(id => this.coursesApi.remove(id));
    const courseUpdates = activeCourses.flatMap(course => {
      if (!course.backendId) {
        return [this.coursesApi.create({ sectionId: this.sectionId!, name: course.name.trim(), iconUrl: course.iconUrl, commonDraft: course.commonDraft, status: course.status })];
      }
      if (this.originalCourseValues.get(course.backendId) === this.courseValue(course)) return [];
      return [this.coursesApi.update(course.backendId, { name: course.name.trim(), iconUrl: course.iconUrl, commonDraft: course.commonDraft, status: course.status })];
    });
    const sectionChanged = name !== this.originalSectionName;
    const operations = [...removals, ...courseUpdates];
    if (!sectionChanged && operations.length === 0) {
      this.toastr.info('There are no changes to save.', 'Up to date');
      return;
    }

    this.spinner.show();
    const finishSave = () => {
        this.sectionName = name;
        this.originalSectionName = name;
        this.editingSectionName = false;
        this.coursesApi.list(this.sectionId!).subscribe({
          next: response => {
            this.courses = response.data.map((course, index) => ({ id: index + 1, backendId: course._id, name: course.name, iconUrl: course.iconUrl ?? '', commonDraft: course.commonDraft ?? '', status: course.status ?? 'pending' }));
            this.nextCourseId = this.courses.length + 1;
            this.setCourseBaseline();
            this.spinner.hide();
            this.toastr.success('Section changes saved.', 'Saved');
            this.loadExistingSections();
          },
          error: () => {
            this.spinner.hide();
            this.toastr.error('Changes were saved, but the course list could not be refreshed.', 'Refresh failed');
          }
        });
    };
    const saveCourses = () => {
      if (!operations.length) {
        finishSave();
        return;
      }
      forkJoin(operations as Array<import('rxjs').Observable<unknown>>).subscribe({
        next: finishSave,
        error: error => {
          this.spinner.hide();
          this.toastr.error(error.error?.message ?? 'Could not save all section changes.', 'Save failed');
        }
      });
    };
    const saveSectionInfo: Observable<unknown> = sectionChanged ? this.sectionsApi.update(this.sectionId, { name }) : of(null);
    saveSectionInfo.subscribe({
      next: saveCourses,
      error: error => {
        this.spinner.hide();
        this.toastr.error(error.error?.message ?? 'Could not save all section changes.', 'Save failed');
      }
    });
  }

  private savePendingDrafts(sectionId: string): void {
    const pending = this.sectionDrafts.filter(draft => !draft.backendId);
    const requests = pending.map((draft, index) => this.draftsApi.createSection(sectionId, { draftName: draft.name, draftOrder: index + 1, content: draft.content }));
    const finish = (created: { data: SectionDraftRecord }[] = []) => {
      pending.forEach((draft, index) => { draft.backendId = created[index]?.data._id; });
      this.spinner.hide();
      this.toastr.success('Section saved.', 'Saved');
      this.loadExistingSections();
    };
    if (!requests.length) {
      finish();
      return;
    }
    forkJoin(requests).subscribe({
      next: finish,
      error: error => { this.spinner.hide(); this.toastr.error(error.error?.message ?? 'Section saved, but its notes could not be saved.', 'Save failed'); this.loadExistingSections(); }
    });
  }

  deleteCurrentSection(): void {
    if (!this.sectionId) {

      this.sectionName = '';
      this.courses = [];
      this.sectionDrafts = [];
      this.addCourse();
      this.sectionPage = Math.min(this.sectionPage, this.totalSectionPages);
      this.showDeleteModal = false;
      this.toastr.info('New section form cleared.', 'Cleared');
      return;
    }
    this.sectionsApi.remove(this.sectionId).subscribe({
      next: () => { this.showDeleteModal = false; this.toastr.success('Section deleted.', 'Removed'); this.router.navigate(['/dashboard']); },
      error: error => this.toastr.error(error.error?.message ?? 'Could not delete section.', 'Delete failed')
    });
  }
}


