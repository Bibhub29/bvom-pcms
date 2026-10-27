import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { register } from 'swiper/element/bundle';
import { TrackerService } from '../../core/services/tracker.service';

register();

type Priority = 'High' | 'Medium' | 'Low';

interface TrackedCourse {
  id: string;
  name: string;
  totalChapters: number;
  completedChapters: number;
}

interface Task {
  id: string;
  title: string;
  priority: Priority;
  done: boolean;
}

interface HeroSlide {
  eyebrow: string;
  motto: string;
  line: string;
  art: 'target' | 'flame' | 'trophy';
  theme: string;
}

interface YearActivity {
  chapters: number[];
  tasks: number[];
}

interface CalendarCell {
  date: string;
  day: number;
  active: boolean;
  isToday: boolean;
}

interface MonthAttendance {
  label: string;
  present: number;
  absent: number;
  total: number;
  rate: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-tracker',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    BaseChartDirective
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './tracker.component.html',
  styleUrl: './tracker.component.css'
})
export class TrackerComponent {
  // ---------- HERO ----------
  slides: HeroSlide[] = [
    {
      eyebrow: 'QUEST LOG · TRACK IT',
      motto: 'Track it. Clear it. Repeat.',
      line: 'Every finished chapter is XP. Keep your courses moving and watch the bars fill up.',
      art: 'target',
      theme: 'theme-indigo'
    },
    {
      eyebrow: 'STREAK · KEEP IT BURNING',
      motto: 'Small wins. Big streaks.',
      line: 'Tick off a task a day and your monthly activity will tell the story for you.',
      art: 'flame',
      theme: 'theme-amber'
    },
    {
      eyebrow: 'FINAL BOSS · FINISH STRONG',
      motto: 'Finish what you start.',
      line: 'Turn pending courses into completed ones, one chapter at a time.',
      art: 'trophy',
      theme: 'theme-teal'
    }
  ];

  // ---------- COURSES ----------
  courses: TrackedCourse[] = [];

  // ---------- TO-DO ----------
  readonly priorities: Priority[] = ['High', 'Medium', 'Low'];
  readonly taskFilters = ['All', 'Pending', 'Done'];
  taskFilter = 'All';
  taskPage = 1;
  readonly taskPageSize = 5;

  tasks: Task[] = [];

  nextTaskId = 1;

  showTaskModal = false;
  editingTaskId: string | null = null;
  taskTitle = '';
  taskPriority: Priority = 'Medium';
  taskDone = false;

  // ---------- CHARTS ----------
  readonly donutType = 'doughnut' as const;
  readonly barType = 'bar' as const;

  taskChartData: ChartData<'doughnut', number[], string> = { labels: [], datasets: [] };
  attendanceChartData: ChartData<'bar', number[], string> = { labels: [], datasets: [] };
  activityChartData: ChartData<'bar', number[], string> = { labels: [], datasets: [] };

  readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: { legend: { display: false } }
  };

  barOptions: ChartOptions<'bar'> = {};
  attendanceOptions: ChartOptions<'bar'> = {};

  // ---------- MONTHLY ACTIVITY ----------
  monthlyData: Record<number, YearActivity> = {};

  activityYear = 2026;

  // ---------- DAILY ACTIVITY CALENDAR ----------
  readonly weekdays = WEEKDAYS;
  readonly maxMonthsBack = 11;
  viewMonth: Date = this.startOfMonth(new Date());

  dailyActivity: Record<string, boolean> = {};
  readonly dailyActivityStorageKey = '';
  readonly attendanceMonths = 6;

  constructor(
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private tracker: TrackerService
  ) {
    this.loadTasks();
    this.tracker.courses().subscribe({
      next: response => { this.courses = response.data.map(row => ({ id: row.course._id, name: row.course.name, totalChapters: row.progress.totalChapters, completedChapters: row.progress.completedChapters })); },
      error: () => this.toastr.error('Could not load tracked courses.', 'Loading failed')
    });
    this.loadActivity(this.activityYear);
    this.updateChartTheme();
    this.refreshTaskChart();
    this.refreshAttendanceChart();
    this.refreshActivityChart();
  }

  updateChartTheme(): void {
    const rootStyles = getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue('--text-secondary').trim() || '#4b5563';
    const gridColor = rootStyles.getPropertyValue('--border-color').trim() || '#e5e7eb';

    this.barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      color: textColor,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 18, color: textColor } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: textColor },
          grid: { color: gridColor }
        }
      }
    };

    // Stacked bars: present + absent days make up each month's full bar
    this.attendanceOptions = {
      responsive: true,
      maintainAspectRatio: false,
      color: textColor,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, color: textColor } },
        tooltip: {
          callbacks: {
            label: item => ` ${item.dataset.label}: ${item.parsed.y} days`,
            footer: items => {
              const stats = this.monthStats(this.attendanceMonths - 1 - items[0].dataIndex);
              return `Attendance: ${stats.rate}%`;
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: textColor } },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0, color: textColor },
          grid: { color: gridColor }
        }
      }
    };
  }

  // =========================================
  // STAT CARDS
  // =========================================
  get totalCourses(): number { return this.courses.length; }

  get completedCourses(): number {
    return this.courses.filter(c => c.completedChapters >= c.totalChapters).length;
  }

  get pendingCourses(): number { return this.totalCourses - this.completedCourses; }

  get totalChapters(): number {
    return this.courses.reduce((sum, c) => sum + c.totalChapters, 0);
  }

  get completedChapters(): number {
    return this.courses.reduce((sum, c) => sum + c.completedChapters, 0);
  }

  get totalCoursesPercent(): number { return this.totalCourses ? 100 : 0; }
  get pendingCoursesPercent(): number { return this.percentOf(this.pendingCourses, this.totalCourses); }
  get completedCoursesPercent(): number { return this.percentOf(this.completedCourses, this.totalCourses); }
  get completedChaptersPercent(): number { return this.percentOf(this.completedChapters, this.totalChapters); }

  private percentOf(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  // =========================================
  // TO-DO LIST
  // =========================================
  get totalTasks(): number { return this.tasks.length; }
  get doneTasks(): number { return this.tasks.filter(t => t.done).length; }
  get pendingTasks(): number { return this.totalTasks - this.doneTasks; }
  get taskRate(): number { return this.percentOf(this.doneTasks, this.totalTasks); }

  get filteredTasks(): Task[] {
    return this.tasks.filter(task => {
      if (this.taskFilter === 'Pending') return !task.done;
      if (this.taskFilter === 'Done') return task.done;
      return true;
    });
  }

  get totalTaskPages(): number {
    return Math.max(1, Math.ceil(this.filteredTasks.length / this.taskPageSize));
  }

  get paginatedTasks(): Task[] {
    const start = (this.taskPage - 1) * this.taskPageSize;
    return this.filteredTasks.slice(start, start + this.taskPageSize);
  }

  get priorityStats() {
    return this.priorities.map(label => {
      const items = this.tasks.filter(t => t.priority === label);
      const done = items.filter(t => t.done).length;
      return { label, total: items.length, done, percent: this.percentOf(done, items.length) };
    });
  }

  getVisiblePages(current: number, total: number): number[] {
    const size = 5;
    let end = Math.min(total, Math.max(1, current - 2) + size - 1);
    const start = Math.max(1, end - size + 1);
    end = Math.min(total, start + size - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  changeTaskPage(page: number): void {
    if (page >= 1 && page <= this.totalTaskPages) this.taskPage = page;
  }

  setTaskFilter(filter: string): void {
    this.taskFilter = filter;
    this.taskPage = 1;
  }

  toggleTask(task: Task): void {
    this.tracker.completeTask(task.id, !task.done).subscribe({
      next: () => { task.done = !task.done; this.refreshTaskChart(); },
      error: () => this.toastr.error('Could not update task.', 'Update failed')
    });
  }

  openAddTask(): void {
    this.editingTaskId = null;
    this.taskTitle = '';
    this.taskPriority = 'Medium';
    this.taskDone = false;
    this.showTaskModal = true;
  }

  openEditTask(task: Task): void {
    this.editingTaskId = task.id;
    this.taskTitle = task.title;
    this.taskPriority = task.priority;
    this.taskDone = task.done;
    this.showTaskModal = true;
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
  }

  saveTask(): void {
    const title = this.taskTitle.trim();

    if (!title) {
      this.toastr.error('Please enter a task name.', 'Validation Error');
      return;
    }

    const data = { title, priority: this.taskPriority.toLowerCase(), isCompleted: this.taskDone };
    const request = this.editingTaskId ? this.tracker.updateTask(this.editingTaskId, data) : this.tracker.createTask(data);
    request.subscribe({ next: () => { this.showTaskModal = false; this.taskFilter = 'All'; this.loadTasks(); }, error: error => this.toastr.error(error.error?.message ?? 'Could not save task.', 'Save failed') });
  }

  deleteTask(task: Task): void {
    this.tracker.deleteTask(task.id).subscribe({ next: () => this.loadTasks(), error: () => this.toastr.error('Could not delete task.', 'Delete failed') });
  }

  // =========================================
  // CHARTS
  // =========================================
  private refreshTaskChart(): void {
    this.taskChartData = {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [this.doneTasks, this.pendingTasks],
        backgroundColor: ['#10b981', '#c7d2fe'],
        hoverBackgroundColor: ['#047857', '#a5b4fc'],
        borderWidth: 0
      }]
    };
  }

  /** One stacked bar per month, oldest on the left and the current month on the right */
  private refreshAttendanceChart(): void {
    const months = Array.from({ length: this.attendanceMonths }, (_, i) =>
      this.monthStats(this.attendanceMonths - 1 - i)
    );

    this.attendanceChartData = {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Present',
          data: months.map(m => m.present),
          backgroundColor: '#06b6d4',
          hoverBackgroundColor: '#0e7490',
          borderWidth: 0,
          borderSkipped: false
        },
        {
          label: 'Absent',
          data: months.map(m => m.absent),
          backgroundColor: '#c7d2fe',
          hoverBackgroundColor: '#a5b4fc',
          borderWidth: 0,
          borderSkipped: false
        }
      ]
    };
  }

  private refreshActivityChart(): void {
    const data = this.monthlyData[this.activityYear] ?? { chapters: Array(12).fill(0), tasks: Array(12).fill(0) };

    this.activityChartData = {
      labels: MONTHS,
      datasets: [
        { label: 'Chapters completed', data: data.chapters, backgroundColor: '#6366f1', hoverBackgroundColor: '#4338ca', borderWidth: 0 },
        { label: 'Tasks completed', data: data.tasks, backgroundColor: '#ec4899', hoverBackgroundColor: '#be185d', borderWidth: 0 }
      ]
    };
  }

  // =========================================
  // MONTHLY ACTIVITY
  // =========================================
  get years(): number[] {
    return Object.keys(this.monthlyData).map(Number).sort((a, b) => a - b);
  }

  get hasPrevYear(): boolean { return this.years.includes(this.activityYear - 1); }
  get hasNextYear(): boolean { return this.years.includes(this.activityYear + 1); }

  private get yearData(): YearActivity {
    return this.monthlyData[this.activityYear] ?? { chapters: Array(12).fill(0), tasks: Array(12).fill(0) };
  }

  get yearChapters(): number { return this.yearData.chapters.reduce((a, b) => a + b, 0); }
  get yearTasks(): number { return this.yearData.tasks.reduce((a, b) => a + b, 0); }

  get bestMonth(): string {
    const chapters = this.yearData.chapters;
    const max = Math.max(...chapters);
    return max > 0 ? MONTHS[chapters.indexOf(max)] : '—';
  }

  get averageChapters(): number {
    const active = this.yearData.chapters.filter(value => value > 0).length;
    return active ? Math.round(this.yearChapters / active) : 0;
  }

  // =========================================
  // DAILY ACTIVITY (MONTH CALENDAR)
  // =========================================
  get viewMonthLabel(): string {
    return `${FULL_MONTHS[this.viewMonth.getMonth()]} ${this.viewMonth.getFullYear()}`;
  }

  get isViewingCurrentMonth(): boolean {
    const now = new Date();
    return this.viewMonth.getFullYear() === now.getFullYear()
      && this.viewMonth.getMonth() === now.getMonth();
  }

  get canGoPrevMonth(): boolean {
    const now = new Date();
    const earliest = new Date(now.getFullYear(), now.getMonth() - this.maxMonthsBack, 1);
    return this.viewMonth > earliest;
  }

  get canGoNextMonth(): boolean {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.viewMonth < currentMonthStart;
  }

  get daysInViewMonth(): number {
    return new Date(this.viewMonth.getFullYear(), this.viewMonth.getMonth() + 1, 0).getDate();
  }

  /** All cells of the viewed month, padded with `null` so each row starts on Sunday. */
  get calendarCells(): (CalendarCell | null)[] {
    const year = this.viewMonth.getFullYear();
    const month = this.viewMonth.getMonth();
    const daysInMonth = this.daysInViewMonth;
    const firstWeekday = new Date(year, month, 1).getDay();
    const today = this.todayKey;

    const cells: (CalendarCell | null)[] = [];

    for (let i = 0; i < firstWeekday; i++) cells.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = this.dateKey(new Date(year, month, day));
      cells.push({
        date,
        day,
        active: !!this.dailyActivity[date],
        isToday: date === today
      });
    }

    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }

  get activeDaysInMonth(): number {
    const year = this.viewMonth.getFullYear();
    const month = this.viewMonth.getMonth();
    let count = 0;

    for (let day = 1; day <= this.daysInViewMonth; day++) {
      if (this.dailyActivity[this.dateKey(new Date(year, month, day))]) count++;
    }

    return count;
  }

  changeMonth(direction: -1 | 1): void {
    const next = new Date(this.viewMonth.getFullYear(), this.viewMonth.getMonth() + direction, 1);

    if (direction === 1 && !this.canGoNextMonth) return;
    if (direction === -1 && !this.canGoPrevMonth) return;

    this.viewMonth = next;
  }

  // =========================================
  // MONTHLY ATTENDANCE
  // =========================================
  get todayKey(): string { return this.dateKey(this.daysAgo(0)); }

  get thisMonth(): MonthAttendance { return this.monthStats(0); }
  get lastMonth(): MonthAttendance { return this.monthStats(1); }

  /** Difference in attendance rate (percentage points) between this and last month */
  get attendanceChange(): number { return this.thisMonth.rate - this.lastMonth.rate; }

  get currentStreak(): number {
    let streak = 0;
    for (let offset = 0; ; offset++) {
      if (!this.dailyActivity[this.dateKey(this.daysAgo(offset))]) break;
      streak++;
    }
    return streak;
  }

  /**
   * Attendance for a month, `offset` months back (0 = this month).
   * The current month only counts days up to today; earlier months count every day.
   */
  private monthStats(offset: number): MonthAttendance {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const year = first.getFullYear();
    const month = first.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = offset === 0 ? today.getDate() : daysInMonth;

    let present = 0;
    for (let day = 1; day <= total; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (this.dailyActivity[key]) present++;
    }

    const label = year === today.getFullYear()
      ? MONTHS[month]
      : `${MONTHS[month]} ${String(year).slice(2)}`;

    return { label, present, absent: total - present, total, rate: this.percentOf(present, total) };
  }

  toggleDailyActivity(date: string): void {
    const nextState = !this.dailyActivity[date];
    this.tracker.saveActivity(date, nextState).subscribe({ next: () => { this.dailyActivity[date] = nextState; this.refreshAttendanceChart(); }, error: () => this.toastr.error('Could not save attendance.', 'Save failed') });
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private daysAgo(offset: number): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    return date;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadDailyActivity(): void {
    this.dailyActivity = {};
  }

  private saveDailyActivity(): void {
    this.refreshAttendanceChart();
  }

  private loadTasks(): void {
    this.tracker.tasks().subscribe({
      next: response => { this.tasks = response.data.map(task => ({ id: task._id, title: task.title, priority: (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) as Priority, done: task.isCompleted })); this.refreshTaskChart(); },
      error: () => this.toastr.error('Could not load tracker tasks.', 'Loading failed')
    });
  }

  private loadActivity(year:number):void {
    this.tracker.activity(year).subscribe({ next: response => {
      this.dailyActivity = Object.fromEntries(response.data.map(row => [row.date, row.attended]));
      const chapters=Array(12).fill(0), tasks=Array(12).fill(0);
      for (const row of response.data) { const month=new Date(`${row.date}T00:00:00`).getMonth(); chapters[month]+=row.chaptersCompleted; tasks[month]+=row.tasksCompleted; }
      this.monthlyData[year]={chapters,tasks}; this.refreshActivityChart(); this.refreshAttendanceChart();
    }, error: () => this.toastr.error('Could not load saved activity.', 'Loading failed') });
  }

  changeYear(direction: -1 | 1): void {
    const next = this.activityYear + direction;
    if (!this.years.includes(next)) return;

    this.withLoader(() => {
      this.activityYear = next;
      this.loadActivity(next);
      this.refreshActivityChart();
    }, 350);
  }

  // =========================================
  // HELPERS
  // =========================================
  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private withLoader(action: () => void, delay = 400): void {
    this.spinner.show();
    setTimeout(() => {
      try { action(); } finally { this.spinner.hide(); }
    }, delay);
  }
}
