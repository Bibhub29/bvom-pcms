import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { of } from 'rxjs';
import { CourseDetailsComponent } from './course-details.component';

describe('CourseDetailsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseDetailsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ToastrService,
          useValue: jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning', 'info']),
        },
        {
          provide: NgxSpinnerService,
          useValue: {
            ...jasmine.createSpyObj('NgxSpinnerService', ['show', 'hide']),
            getSpinner: () => of({}),
          },
        },
      ],
    }).compileComponents();
  });

  it('filters chapters by search text and status', () => {
    const fixture = TestBed.createComponent(CourseDetailsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.searchText = 'variables';
    component.statusFilter = 'Updated';

    expect(component.filteredChapters.map(chapter => chapter.chapterName))
      .toEqual(['Variables and Data Types']);
  });

  it('provides chart values from the current chapter statuses', () => {
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;

    expect(component.chapterStatusChartType).toBe('doughnut');
    expect(component.chapterStatusChartData.datasets[0].data).toEqual([1, 1, 1]);

    component.chapters[0].status = 'Published';

    expect(component.chapterStatusChartData.datasets[0].data).toEqual([0, 1, 2]);
  });

  it('saves a new draft with both explanation fields', fakeAsync(() => {
    const fixture = TestBed.createComponent(CourseDetailsComponent);
    const component = fixture.componentInstance;
    const originalDraftCount = component.drafts.length;

    component.openAddDraft();
    component.draftName = 'Functions';
    component.commonDraft = 'A reusable overview.';
    component.customDraft = 'Remember the return value.';
    component.saveDraft();
    tick(800);

    expect(component.drafts.length).toBe(originalDraftCount + 1);
    expect(component.drafts.at(-1)).toEqual(jasmine.objectContaining({
      draftName: 'Functions',
      commonDraft: 'A reusable overview.',
      customDraft: 'Remember the return value.',
    }));
  }));
});
