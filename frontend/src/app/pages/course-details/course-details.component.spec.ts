import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { of } from 'rxjs';
import { ChapterService } from '../../core/services/chapter.service';
import { CourseService } from '../../core/services/course.service';
import { DraftService } from '../../core/services/draft.service';
import { CourseDetailsComponent } from './course-details.component';

describe('CourseDetailsComponent', () => {
  beforeEach(async () => {
    const coursesApi = jasmine.createSpyObj('CourseService', ['get']);
    const chaptersApi = jasmine.createSpyObj('ChapterService', ['list']);
    const draftsApi = jasmine.createSpyObj('DraftService', [
      'listCourse', 'importCourse', 'createCourse', 'updateCourse', 'updateStatus', 'remove', 'reorderCourse',
    ]);
    draftsApi.listCourse.and.returnValue(of({ data: [] }));
    draftsApi.importCourse.and.returnValue(of({ data: [] }));

    await TestBed.configureTestingModule({
      imports: [CourseDetailsComponent],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: coursesApi },
        { provide: ChapterService, useValue: chaptersApi },
        { provide: DraftService, useValue: draftsApi },
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

  it('imports each draft with its own common draft value', () => {
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    const draftsApi = TestBed.inject(DraftService);
    component.courseId = 'course-123';
    component.courseCommonDraft = 'Course default';
    component.bulkDraftJson = JSON.stringify([
      { name: 'Draft one', order: 1, 'common Draft': 'First common draft' },
      { name: 'Draft two', order: 2, commonDraft: 'Second common draft' },
      { name: 'Draft three', order: 3 },
    ]);

    component.importDrafts();

    expect(draftsApi.importCourse).toHaveBeenCalledWith('course-123', [
      { draftName: 'Draft one', draftOrder: 1, commonDraft: 'First common draft', customDraft: '', status: 'pending' },
      { draftName: 'Draft two', draftOrder: 2, commonDraft: 'Second common draft', customDraft: '', status: 'pending' },
      { draftName: 'Draft three', draftOrder: 3, commonDraft: 'Course default', customDraft: '', status: 'pending' },
    ]);
  });

  it('provides the requested draft quick-copy prompts', () => {
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;

    expect(component.commonTexts.nextChapter)
      .toBe('If all the given chapters have been completed, stop and write "Given chapters are completed." Otherwise, continue with the next chapter.');
    expect(component.commonTexts.nextPart)
      .toBe('If all parts of the current chapter have been completed, stop and write "Chapter completed." Otherwise, continue with the next part.');
    expect(component.commonTexts.titleAndDescription)
      .toBe('Give a short reply with an SEO-friendly blog title and a search description of 150 characters or fewer for the previous topic in text block. Format the response in exactly 2 text blocks. First, write the heading "Title", followed by the title in a separate text block. Then, write the heading "Description", followed by the search description in a separate text block.');
    expect(component.commonTexts.codeblockMistake).toBe('Write everything in a code block.');
    expect(component.commonTexts.emergencyCorrection)
      .toBe('Check the previous command carefully. Identify and correct any mistakes or missing requirements, then provide the complete and correct output again.');
  });
});
