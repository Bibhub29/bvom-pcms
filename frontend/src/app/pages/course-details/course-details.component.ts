import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { CourseService } from '../../core/services/course.service';
import { ChapterService } from '../../core/services/chapter.service';
import { DraftService } from '../../core/services/draft.service';

interface Chapter {
  id: string;
  chapterName: string;
  chapterOrder: number;
  mainTitle: string;
  description: string;
  content: string;
  courseName: string;
  chatLink: string;
  status: string;
}

interface Draft {
  id: string;
  draftName: string;
  draftOrder: number;
  commonDraft: string;
  customDraft: string;
  status: 'pending' | 'working' | 'completed';
  statusSaving?: boolean;
}

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './course-details.component.html',
  styleUrl: './course-details.component.css'
})
export class CourseDetailsComponent {
  courseId = '';
  courseName = '';
  courseCommonDraft = '';

  activeTab = 'chapters';
  currentChapterPage = 1;
  currentDraftPage = 1;
  pageSize = 5;
  searchText = '';
  statusFilter = 'All';

  // Chapter navigation (used in both tabs)
  selectedChapterId: string | 'all' = 'all';
  selectedDraftChapterId: string | 'all' = 'all';

  // 5 common copy texts for draft section
  commonTexts = {
    next: `Next chapter. If all the given chapters have been completed, stop and write "Given chapters are completed." Otherwise, continue with the next chapter.`,
    continue: `Next part. If all parts of the current chapter have been completed, stop and write "Chapter completed." Otherwise, continue with the next part.`,
    stop: `Give a short reply with an SEO-friendly blog title and a search description of 150 characters or fewer for the previous topic in text block. Format the response in exactly 2 text blocks. First, write the heading "Title", followed by the title in a separate text block. Then, write the heading "Description", followed by the search description in a separate text block.`,
    codes: `Write everything in a code block.`,
    again: `Check the previous command carefully. Identify and correct any mistakes or missing requirements, then provide the complete and correct output again.`
  };

  chapters: Chapter[] = [];

  drafts: Draft[] = [];

  nextChapterId = 1;

  // Modal visibility states
  showChapterModal = false;
  showDraftModal = false;
  showBulkChapterModal = false;
  showBulkDraftModal = false;
  showDeleteChapterModal = false;
  showDeleteDraftModal = false;

  // Chapter form state
  activeChapterId = '';
  editingChapterId = '';
  chapterName = '';
  chapterOrder = 1;
  chapterMainTitle = '';
  chapterDescription = '';
  chapterContent = '';
  chapterCourseName = '';
  chapterChatLink = '';

  // Tracks which field is currently in "edit mode"
  activeField: string | null = null;

  // Draft form state
  activeDraftId = '';
  editingDraftId = '';
  draftName = '';
  draftOrder = 1;
  commonDraft = '';
  customDraft = '';

  // Bulk import JSON
  bulkChapterJson = '[\n  { "name": "Chapter name", "order": 1 },\n  { "name": "Next chapter name", "order": 2 }\n]';
  bulkDraftJson = '[\n  { "name": "Draft name", "order": 1 },\n  { "name": "Next draft name", "order": 2 }\n]';

  // Drag & drop state
  draggedChapterId = '';
  draggedDraftId = '';

  constructor(
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private coursesApi: CourseService,
    private chaptersApi: ChapterService,
    private draftsApi: DraftService
  ) {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) {
      this.coursesApi.get(this.courseId).subscribe({ next: result => {
        this.courseName = result.data.name;
        this.courseCommonDraft = result.data.commonDraft ?? '';
        this.drafts.forEach(draft => draft.commonDraft = this.courseCommonDraft);
      }, error: () => this.toastr.error('Could not load course.', 'Loading failed') });
      this.loadChapters();
      this.loadDrafts();
    }
  }

  private loadDrafts(): void {
    this.draftsApi.listCourse(this.courseId).subscribe({
      next: result => {
        this.drafts = result.data.map(draft => ({
          id: draft._id,
          draftName: draft.draftName,
          draftOrder: draft.draftOrder,
          commonDraft: draft.commonDraft || this.courseCommonDraft,
          customDraft: draft.customDraft,
          status: draft.status === 'in-progress' ? 'working' : ['approved', 'published'].includes(draft.status) ? 'completed' : 'pending'
        }));
      },
      error: () => this.toastr.error('Could not load course drafts.', 'Loading failed')
    });
  }

  private loadChapters(): void {
    this.chaptersApi.list(this.courseId).subscribe({
      next: result => { this.chapters = result.data.map(chapter => ({ id: chapter._id, chapterName: chapter.name, chapterOrder: chapter.order, mainTitle: '', description: '', content: chapter.content, courseName: this.courseName, chatLink: chapter.chatLink, status: chapter.status })); },
      error: () => this.toastr.error('Could not load chapters.', 'Loading failed')
    });
  }

  // --- STATS GETTERS ---
  get totalChapters() { return this.chapters.length; }
  get pendingChapters() { return this.chapters.filter(c => c.status === 'Pending').length; }
  get updatedChapters() { return this.chapters.filter(c => c.status === 'Updated').length; }
  get publishedChapters() { return this.chapters.filter(c => c.status === 'Published').length; }

  get totalPercent() { return this.totalChapters ? 100 : 0; }
  get pendingPercent() { return this.totalChapters ? Math.round((this.pendingChapters / this.totalChapters) * 100) : 0; }
  get updatedPercent() { return this.totalChapters ? Math.round((this.updatedChapters / this.totalChapters) * 100) : 0; }
  get publishedPercent() { return this.totalChapters ? Math.round((this.publishedChapters / this.totalChapters) * 100) : 0; }

  // --- FILTERING & PAGINATION GETTERS ---
  get filteredChapters() {
    const search = this.searchText.trim().toLowerCase();
    return this.chapters.filter(chapter => {
      const matchesJump = this.selectedChapterId === 'all' || chapter.id === this.selectedChapterId;
      const matchesSearch = !search || [chapter.chapterName, chapter.mainTitle, chapter.description].some(v => v.toLowerCase().includes(search));
      const matchesStatus = this.statusFilter === 'All' || chapter.status === this.statusFilter;
      return matchesJump && matchesSearch && matchesStatus;
    });
  }

  get filteredDrafts() {
    const search = this.searchText.trim().toLowerCase();
    const chapter = this.selectedDraftChapterId === 'all'
      ? null
      : this.chapters.find(c => c.id === this.selectedDraftChapterId);

    return this.drafts.filter(draft => {
      const matchesChapter = !chapter || draft.draftName.trim().toLowerCase() === chapter.chapterName.trim().toLowerCase();
      const matchesSearch = !search || [draft.draftName, draft.commonDraft, draft.customDraft].some(v => v.toLowerCase().includes(search));
      return matchesChapter && matchesSearch;
    });
  }

  get draftRelatedChapters() {
    const draftNames = new Set(this.drafts.map(draft => draft.draftName.trim().toLowerCase()));
    return this.chapters.filter(chapter => draftNames.has(chapter.chapterName.trim().toLowerCase()));
  }

  get totalChapterPages() { return Math.max(1, Math.ceil(this.filteredChapters.length / this.pageSize)); }
  get totalDraftPages() { return Math.max(1, Math.ceil(this.filteredDrafts.length / this.pageSize)); }

  get paginatedChapters() {
    const start = (this.currentChapterPage - 1) * this.pageSize;
    return this.filteredChapters.slice(start, start + this.pageSize);
  }

  get paginatedDrafts() {
    const start = (this.currentDraftPage - 1) * this.pageSize;
    return this.filteredDrafts.slice(start, start + this.pageSize);
  }

  /** Shows up to 5 page numbers around the current page */
  getVisiblePages(current: number, total: number): number[] {
    const size = 5;
    let end = Math.min(total, Math.max(1, current - 2) + size - 1);
    const start = Math.max(1, end - size + 1);
    end = Math.min(total, start + size - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // --- TAB & PAGE CONTROLS ---
  changeTab(tab: string) {
    this.activeTab = tab;
    this.searchText = '';
    this.statusFilter = 'All';
    this.selectedChapterId = 'all';
    this.selectedDraftChapterId = 'all';
    this.resetPages();
  }

  resetPages() {
    this.currentChapterPage = 1;
    this.currentDraftPage = 1;
  }

  changeChapterPage(page: number) {
    if (page >= 1 && page <= this.totalChapterPages) this.currentChapterPage = page;
  }

  changeDraftPage(page: number) {
    if (page >= 1 && page <= this.totalDraftPages) this.currentDraftPage = page;
  }

  // --- EDIT TOGGLE LOGIC ---
  toggleEdit(field: string, element: HTMLInputElement | HTMLTextAreaElement) {
    if (this.activeField === field) {
      this.activeField = null;
    } else {
      this.activeField = field;
      // Delay lets Angular remove [readonly] before selecting the text
      setTimeout(() => {
        element.focus();
        element.select();
      }, 50);
    }
  }

  clearActiveField() {
    this.activeField = null;
  }

  // --- SAVE / COPY ---
  saveChanges() {
    this.spinner.show();
    setTimeout(() => {
      this.chapters.forEach(c => c.courseName = this.courseName);
      this.spinner.hide();
      this.toastr.success('Course changes updated successfully.', 'Saved');
    }, 800);
  }

  async copyText(value: string, customMessage: string = 'Copied to clipboard.') {
    if (!value) {
      this.toastr.warning('Nothing to copy.', 'Empty');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      this.toastr.success(customMessage, 'Copied');
    } catch {
      // Fallback for browsers / contexts where the Clipboard API is blocked
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      ok ? this.toastr.success(customMessage, 'Copied') : this.toastr.error('Could not copy to clipboard.', 'Copy Failed');
    }
  }

  copyEntireDraft(draft: Draft) {
    const combined = [draft.commonDraft || this.courseCommonDraft, draft.customDraft]
      .map(text => text.trim())
      .filter(Boolean)
      .join('\n\n');
    this.copyText(combined, 'Entire draft copied to clipboard.');
  }

  // --- CHAPTER CRUD ---
  onChapterCardClick(chapter: Chapter, event: Event): void {
    const target = event.target;
    if (target instanceof Element && target.closest('button, select, a, input, textarea, .drag-handle')) return;
    this.openEditChapter(chapter);
  }

  openAddChapter() {
    this.activeField = null;
    this.editingChapterId = '';
    this.chapterName = '';
    this.chapterOrder = this.chapters.length + 1;
    this.chapterMainTitle = '';
    this.chapterDescription = '';
    this.chapterContent = '';
    this.chapterCourseName = this.courseName;
    this.chapterChatLink = '';
    this.showChapterModal = true;
  }

  openEditChapter(chapter: Chapter) {
    this.activeField = null;
    this.editingChapterId = chapter.id;
    this.chapterName = chapter.chapterName;
    this.chapterOrder = chapter.chapterOrder;
    this.chapterMainTitle = chapter.mainTitle;
    this.chapterDescription = chapter.description;
    this.chapterContent = chapter.content;
    this.chapterCourseName = chapter.courseName;
    this.chapterChatLink = chapter.chatLink;
    this.showChapterModal = true;
  }

  saveChapter() {
    const name = this.chapterName.trim();
    if (!name) {
      this.toastr.error('Please enter a chapter name.', 'Validation Error');
      return;
    }

    const data = { courseId: this.courseId, name, order: Number(this.chapterOrder), content: this.chapterContent, chatLink: this.chapterChatLink };
    const request = this.editingChapterId ? this.chaptersApi.update(this.editingChapterId, data) : this.chaptersApi.create(data);
    request.subscribe({ next: () => { this.showChapterModal = false; this.toastr.success('Chapter saved.', 'Success'); this.loadChapters(); }, error: error => this.toastr.error(error.error?.message ?? 'Could not save chapter.', 'Save failed') });
  }

  changeChapterStatus(chapter: Chapter, status: string) {
    if (['Pending', 'Updated', 'Published'].includes(status)) {
      this.chaptersApi.setStatus(chapter.id, status as 'Pending'|'Updated'|'Published').subscribe({ next: () => { chapter.status = status; }, error: () => this.toastr.error('Could not update chapter status.', 'Update failed') });
    }
  }

  openDeleteChapter(chapter: Chapter) {
    this.activeChapterId = chapter.id;
    this.showDeleteChapterModal = true;
  }

  deleteChapter() {
    if (this.activeChapterId) this.chaptersApi.remove(this.activeChapterId).subscribe({ next: () => this.loadChapters(), error: () => this.toastr.error('Could not delete chapter.', 'Delete failed') });
    if (this.selectedChapterId === this.activeChapterId) this.selectedChapterId = 'all';
    if (this.selectedDraftChapterId === this.activeChapterId) this.selectedDraftChapterId = 'all';
    this.currentChapterPage = Math.min(this.currentChapterPage, this.totalChapterPages);
    this.showDeleteChapterModal = false;
    this.toastr.warning('Chapter deleted.', 'Removed');
  }

  sortChapters() {
    this.chapters.sort((a, b) => a.chapterOrder - b.chapterOrder);
    this.chapters.forEach((c, i) => c.chapterOrder = i + 1);
  }

  importChapters() {
    try {
      const data = JSON.parse(this.bulkChapterJson);
      if (!Array.isArray(data) || data.length === 0) throw new Error();

      const chapters = data.map(item => ({ name: String(item?.name ?? '').trim(), order: Number(item?.order) }));
      if (chapters.some(chapter => !chapter.name || !Number.isInteger(chapter.order) || chapter.order < 1)) throw new Error();
      this.chaptersApi.bulkImport(this.courseId, chapters).subscribe({
        next: () => { this.showBulkChapterModal = false; this.toastr.success(`${chapters.length} chapters imported.`, 'Import Successful'); this.loadChapters(); },
        error: error => this.toastr.error(error.error?.message ?? 'Chapter import failed.', 'Import Failed')
      });
    } catch {
      this.toastr.error('Invalid JSON format.', 'Import Failed');
    }
  }

  // --- DRAFT CRUD ---
  openAddDraft() {
    this.editingDraftId = '';
    this.draftName = '';
    this.draftOrder = this.drafts.length + 1;
    this.commonDraft = this.courseCommonDraft;
    this.customDraft = '';
    this.showDraftModal = true;
  }

  /** Used by the empty state when a chapter is selected but has no draft yet */
  createDraftForSelectedChapter() {
    const chapter = this.chapters.find(c => c.id === this.selectedDraftChapterId);
    this.openAddDraft();
    if (chapter) this.draftName = chapter.chapterName;
  }

  openEditDraft(draft: Draft) {
    this.editingDraftId = draft.id;
    this.draftName = draft.draftName;
    this.draftOrder = draft.draftOrder;
    this.commonDraft = this.courseCommonDraft;
    this.customDraft = draft.customDraft;
    this.showDraftModal = true;
  }

  saveDraft() {
    const name = this.draftName.trim();
    if (!name) {
      this.toastr.error('Please enter a draft name.', 'Validation Error');
      return;
    }

    const data = { draftName: name, draftOrder: Number(this.draftOrder), commonDraft: this.courseCommonDraft, customDraft: this.customDraft };
    const request = this.editingDraftId
      ? this.draftsApi.updateCourse(this.editingDraftId, data)
      : this.draftsApi.createCourse(this.courseId, { ...data, status: 'pending' });
    this.spinner.show();
    request.subscribe({
      next: () => {
        this.showDraftModal = false;
        this.spinner.hide();
        this.loadDrafts();
        this.toastr.success('Draft saved successfully.', 'Success');
      },
      error: error => { this.spinner.hide(); this.toastr.error(error.error?.message ?? 'Could not save draft.', 'Save failed'); }
    });
  }

  setDraftStatus(draft: Draft, status: Draft['status']) {
    if (draft.statusSaving || draft.status === status) return;
    draft.statusSaving = true;
    const apiStatus = status === 'working' ? 'in-progress' : status === 'completed' ? 'approved' : 'pending';
    this.draftsApi.updateStatus(draft.id, apiStatus).subscribe({
      next: () => {
        draft.statusSaving = false;
        draft.status = status;
        this.toastr.info(`${draft.draftName} marked ${status}.`, 'Draft Updated');
      },
      error: error => {
        draft.statusSaving = false;
        this.toastr.error(error.error?.message ?? 'Could not update draft status.', 'Update failed');
      }
    });
  }

  openDeleteDraft(draft: Draft) {
    this.activeDraftId = draft.id;
    this.showDeleteDraftModal = true;
  }

  deleteDraft() {
    this.draftsApi.remove(this.activeDraftId).subscribe({
      next: () => { this.showDeleteDraftModal = false; this.toastr.warning('Draft deleted.', 'Removed'); this.loadDrafts(); },
      error: error => this.toastr.error(error.error?.message ?? 'Could not delete draft.', 'Delete failed')
    });
  }

  importDrafts() {
    try {
      const data = JSON.parse(this.bulkDraftJson);
      if (!Array.isArray(data) || data.length === 0) throw new Error();
      const drafts = data.map(item => ({ name: String(item?.name ?? '').trim(), order: Number(item?.order) }));
      if (drafts.some(draft => !draft.name || !Number.isInteger(draft.order) || draft.order < 1)) throw new Error();

      this.spinner.show();
      this.draftsApi.importCourse(this.courseId, drafts.map(item => ({ draftName: item.name, draftOrder: item.order, commonDraft: this.courseCommonDraft, customDraft: '', status: 'pending' })))
        .subscribe({
          next: () => { this.showBulkDraftModal = false; this.spinner.hide(); this.toastr.success(`${drafts.length} drafts imported.`, 'Import Successful'); this.loadDrafts(); },
          error: error => { this.spinner.hide(); this.toastr.error(error.error?.message ?? 'Draft import failed.', 'Import Failed'); }
        });
    } catch {
      this.toastr.error('Invalid JSON format.', 'Import Failed');
    }
  }

  // --- DRAG AND DROP REORDERING ---
  onChapterDragStart(chapter: Chapter) { this.draggedChapterId = chapter.id; }
  onChapterDrop(target: Chapter) {
    const from = this.chapters.findIndex(item => item.id === this.draggedChapterId);
    const to = this.chapters.findIndex(item => item.id === target.id);
    if (from < 0 || to < 0 || from === to) return;
    const moved = this.chapters.splice(from, 1)[0];
    this.chapters.splice(to, 0, moved);
    this.chapters.forEach((c, i) => c.chapterOrder = i + 1);
    this.draggedChapterId = '';
  }

  onDraftDragStart(draft: Draft) { this.draggedDraftId = draft.id; }
  onDraftDrop(target: Draft) {
    const from = this.drafts.findIndex(item => item.id === this.draggedDraftId);
    const to = this.drafts.findIndex(item => item.id === target.id);
    if (from < 0 || to < 0 || from === to) return;
    const moved = this.drafts.splice(from, 1)[0];
    this.drafts.splice(to, 0, moved);
    this.drafts.forEach((d, i) => d.draftOrder = i + 1);
    this.draggedDraftId = '';
    this.draftsApi.reorderCourse(this.courseId, this.drafts.map((draft, index) => ({ id: draft.id, order: index + 1 })))
      .subscribe({ error: error => { this.toastr.error(error.error?.message ?? 'Could not save draft order.', 'Reorder failed'); this.loadDrafts(); } });
  }
}

