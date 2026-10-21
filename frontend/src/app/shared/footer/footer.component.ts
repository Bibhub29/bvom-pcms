import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { register } from 'swiper/element/bundle';
import { NoticeService, NoticeType } from '../../core/services/notice.service';

// Registers <swiper-container> / <swiper-slide> web components
register();

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
  selector: 'app-footer',
  standalone: true,
  imports: [FormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements OnInit {
  year = new Date().getFullYear();

  @ViewChild('noticeSwiper') noticeSwiper?: ElementRef<HTMLElement>;

  readonly noticeTypes: NoticeType[] = ['Update', 'Reminder', 'Tip', 'Alert'];
  notices: Notice[] = [];
  noticesLoading = true;

  showNoticeModal = false;
  noticeType: NoticeType = 'Update';
  noticeTitle = '';
  noticeText = '';

  constructor(
    private toastr: ToastrService,
    private noticesApi: NoticeService
  ) {}

  ngOnInit(): void {
    this.noticesApi.list().subscribe({
      next: response => {
        this.notices = response.data.map(notice => this.toNotice(notice));
        this.noticesLoading = false;
        setTimeout(() => (this.noticeSwiper?.nativeElement as any)?.swiper?.update(), 0);
      },
      error: () => {
        this.noticesLoading = false;
        this.toastr.error('Could not load notices.', 'Loading failed');
      }
    });
  }

  // =========================================
  // NOTICE BOARD
  // =========================================
  slideNotices(direction: -1 | 1): void {
    const swiper = (this.noticeSwiper?.nativeElement as any)?.swiper;
    if (!swiper) return;
    direction === 1 ? swiper.slideNext() : swiper.slidePrev();
  }

  openAddNotice(): void {
    this.noticeType = 'Update';
    this.noticeTitle = '';
    this.noticeText = '';
    this.showNoticeModal = true;
  }

  saveNotice(): void {
    const title = this.noticeTitle.trim();
    const text = this.noticeText.trim();

    if (!title || !text) {
      this.toastr.error('Please add a title and a message.', 'Validation Error');
      return;
    }

    this.noticesApi.create({ type: this.noticeType, title, message: text }).subscribe({
      next: response => {
        this.notices.unshift(this.toNotice(response.data));
        this.showNoticeModal = false;
        this.noticeTitle = '';
        this.noticeText = '';
        this.toastr.success('Notice added to the board.', 'Added');
        setTimeout(() => (this.noticeSwiper?.nativeElement as any)?.swiper?.slideTo(0), 100);
      },
      error: error => this.toastr.error(error.error?.message ?? 'Could not add notice.', 'Save failed')
    });
  }

  dismissNotice(notice: Notice): void {
    this.noticesApi.dismiss(notice.id).subscribe({
      next: () => {
        this.notices = this.notices.filter(item => item.id !== notice.id);
        this.toastr.info('Notice dismissed.', 'Dismissed');
      },
      error: () => this.toastr.error('Could not dismiss notice.', 'Update failed')
    });
  }

  private toNotice(notice: { _id: string; type: NoticeType; title: string; message: string; createdAt: string }): Notice {
    const style = this.noticeStyle(notice.type);
    return {
      id: notice._id,
      type: notice.type,
      icon: style.icon,
      tone: style.tone,
      title: notice.title,
      text: notice.message,
      date: new Date(notice.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  }

  private noticeStyle(type: string): { icon: string; tone: Notice['tone'] } {
    switch (type) {
      case 'Reminder':
        return { icon: 'bi-bell-fill', tone: 'warn' };
      case 'Tip':
        return { icon: 'bi-stars', tone: 'success' };
      case 'Alert':
        return { icon: 'bi-exclamation-triangle-fill', tone: 'danger' };
      default:
        return { icon: 'bi-lightning-charge-fill', tone: 'info' };
    }
  }

}
