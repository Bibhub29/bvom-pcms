import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { register } from 'swiper/element/bundle';
import { forkJoin } from 'rxjs';
import { SectionService } from '../../core/services/section.service';
import { CourseService } from '../../core/services/course.service';
import { DashboardService } from '../../core/services/dashboard.service';

register();

interface Course {
  id: string;
  name: string;
  iconUrl: string;
  lessons: number;
  color: string;
  routeId: string;
  imageFailed?: boolean;
}

interface CourseSection {
  id: string;
  name: string;
  category: string;
  courses: Course[];
}

interface HeroSlide {
  eyebrow: string;
  motto: string;
  line: string;
  art: 'gamepad' | 'trophy' | 'rocket';
  theme: string;
}

interface Notice {
  id: string;
  type: string;
  icon: string;
  tone: 'info' | 'warn' | 'success' | 'danger';
  title: string;
  text: string;
  date: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  @ViewChild('filterStrip') filterStrip?: ElementRef<HTMLElement>;

  searchText = '';
  activeFilter = 'All';

  readonly pageSize = 5;
  sectionPages: Record<string, number> = {};

  slides: HeroSlide[] = [
    {
      eyebrow: 'LEVEL 01 Â· START HERE',
      motto: 'Level up your code.',
      line: 'Every lesson is a quest. Pick a course, clear a chapter and keep your streak alive.',
      art: 'gamepad',
      theme: 'theme-indigo'
    },
    {
      eyebrow: 'LEVEL 02 Â· KEEP GOING',
      motto: 'Learn. Build. Win.',
      line: 'Turn notes into drafts, drafts into chapters and chapters into published content.',
      art: 'trophy',
      theme: 'theme-pink'
    },
    {
      eyebrow: 'LEVEL 03 Â· LAUNCH',
      motto: 'Ship something amazing.',
      line: 'Organise your whole knowledge base in one place and launch your next course faster.',
      art: 'rocket',
      theme: 'theme-teal'
    }
  ];

  notices: Notice[] = [];
  noticeTitle = '';
  noticeText = '';
  noticeType: 'info'|'reminder'|'warning'|'success' = 'info';

  sections: CourseSection[] = [];

  constructor(
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private sectionService: SectionService,
    private courseService: CourseService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.dashboardService.notices().subscribe({
      next: response => this.notices = response.data.map(notice => ({ id: notice._id, type: notice.type, icon: 'bi-bell-fill', tone: notice.type === 'warning' ? 'warn' : notice.type === 'success' ? 'success' : 'info', title: notice.title, text: notice.message, date: new Date(notice.createdAt).toLocaleDateString() })),
      error: () => this.notices = []
    });
    this.sectionService.list().subscribe({
      next: response => {
        const sections = response.data;
        if (!sections.length) { this.sections = []; return; }
        forkJoin(sections.map(section => this.courseService.list(section._id))).subscribe({
          next: courseResponses => {
            this.sections = sections.map((section, index) => ({
              id: section._id, name: section.name, category: section.name,
              courses: courseResponses[index].data.map(course => ({
                id: course._id, routeId: course._id, name: course.name,
                iconUrl: course.iconUrl ?? '', lessons: 0, color: 'course-blue'
              }))
            }));
          },
          error: () => this.toastr.error('Could not load courses from the API.', 'Loading failed')
        });
      },
      error: () => this.toastr.error('Could not load sections. Check your API connection.', 'Loading failed')
    });
  }

  get filters(): string[] {
    return ['All', ...Array.from(new Set(this.sections.map(section => section.category)))];
  }

  get visibleSections(): CourseSection[] {
    const search = this.searchText.trim().toLowerCase();

    return this.sections
      .filter(section => this.activeFilter === 'All' || section.category === this.activeFilter)
      .map(section => ({
        ...section,
        courses: section.courses.filter(course =>
          !search ||
          course.name.toLowerCase().includes(search) ||
          section.name.toLowerCase().includes(search)
        )
      }))
      .filter(section => section.courses.length > 0);
  }

  get totalCourses(): number {
    return this.sections.reduce((total, section) => total + section.courses.length, 0);
  }

  get totalLessons(): number {
    return this.sections.reduce(
      (total, section) => total + section.courses.reduce((sum, course) => sum + course.lessons, 0),
      0
    );
  }

  get visibleCourseCount(): number {
    return this.visibleSections.reduce((total, section) => total + section.courses.length, 0);
  }

  get visibleLessonCount(): number {
    return this.visibleSections.reduce(
      (total, section) => total + section.courses.reduce((sum, course) => sum + course.lessons, 0),
      0
    );
  }

  get sectionsPercent(): number { return this.percentOf(this.visibleSections.length, this.sections.length); }
  get coursesPercent(): number { return this.percentOf(this.visibleCourseCount, this.totalCourses); }
  get lessonsPercent(): number { return this.percentOf(this.visibleLessonCount, this.totalLessons); }
  get noticesPercent(): number { return this.notices.length ? 100 : 0; }

  private percentOf(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  totalPagesOf(section: CourseSection): number {
    return Math.max(1, Math.ceil(section.courses.length / this.pageSize));
  }

  pageOf(section: CourseSection): number {
    return Math.min(this.sectionPages[section.id] ?? 1, this.totalPagesOf(section));
  }

  coursesOf(section: CourseSection): Course[] {
    const start = (this.pageOf(section) - 1) * this.pageSize;
    return section.courses.slice(start, start + this.pageSize);
  }

  changeSectionPage(section: CourseSection, page: number): void {
    if (page < 1 || page > this.totalPagesOf(section) || page === this.pageOf(section)) return;
    this.sectionPages[section.id] = page;
  }

  getVisiblePages(current: number, total: number): number[] {
    const size = 5;
    let end = Math.min(total, Math.max(1, current - 2) + size - 1);
    const start = Math.max(1, end - size + 1);
    end = Math.min(total, start + size - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  resetPages(): void {
    this.sectionPages = {};
  }

  setFilter(filter: string): void {
    if (filter === this.activeFilter) return;

    this.withLoader(() => {
      this.activeFilter = filter;
      this.resetPages();
    });
  }

  clearFilters(): void {
    this.withLoader(() => {
      this.searchText = '';
      this.activeFilter = 'All';
      this.resetPages();
      this.toastr.info('Filters cleared.', 'Reset');
    });
  }

  scrollFilters(direction: -1 | 1): void {
    this.filterStrip?.nativeElement.scrollBy({ left: direction * 240, behavior: 'smooth' });
  }

  scrollToCatalog(): void {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  dismissNotice(notice: Notice): void {
    this.dashboardService.dismiss(notice.id).subscribe({ next: () => { this.notices = this.notices.filter(item => item.id !== notice.id); this.toastr.info('Notice dismissed.', 'Dismissed'); }, error: () => this.toastr.error('Could not dismiss notice.', 'Update failed') });
  }

  onImageError(course: Course): void {
    if (course.imageFailed) return;
    course.imageFailed = true;
    this.toastr.warning(`Couldn't load the icon for ${course.name}.`, 'Icon Failed');
  }

  private withLoader(action: () => void): void {
    this.spinner.show();
    setTimeout(() => {
      action();
      this.spinner.hide();
    }, 350);
  }
}

