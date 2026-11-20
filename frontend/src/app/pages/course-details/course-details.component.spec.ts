import { TestBed } from '@angular/core/testing';
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
    component.chapters = [
      { id: '1', chapterName: 'Variables and Data Types', chapterOrder: 1, mainTitle: '', description: '', content: '', courseName: '', chatLink: '', status: 'Updated' },
      { id: '2', chapterName: 'Functions', chapterOrder: 2, mainTitle: '', description: '', content: '', courseName: '', chatLink: '', status: 'Pending' },
    ];
    fixture.detectChanges();

    component.searchText = 'variables';
    component.statusFilter = 'Updated';

    expect(component.filteredChapters.map(chapter => chapter.chapterName))
      .toEqual(['Variables and Data Types']);
  });

  it('counts chapters from their current statuses', () => {
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    component.chapters = [
      { id: '1', chapterName: 'One', chapterOrder: 1, mainTitle: '', description: '', content: '', courseName: '', chatLink: '', status: 'Pending' },
      { id: '2', chapterName: 'Two', chapterOrder: 2, mainTitle: '', description: '', content: '', courseName: '', chatLink: '', status: 'Updated' },
      { id: '3', chapterName: 'Three', chapterOrder: 3, mainTitle: '', description: '', content: '', courseName: '', chatLink: '', status: 'Published' },
    ];

    expect(component.totalChapters).toBe(3);
    expect(component.pendingChapters).toBe(1);
    expect(component.updatedChapters).toBe(1);
    expect(component.publishedChapters).toBe(1);
  });

  it('saves a new draft with the course shared text and custom text', () => {
    const fixture = TestBed.createComponent(CourseDetailsComponent);
    const component = fixture.componentInstance;
    const draftsApi = TestBed.inject(DraftService);
    component.courseId = 'course-123';
    component.courseCommonDraft = 'A reusable overview.';
    (draftsApi.createCourse as jasmine.Spy).and.returnValue(of({ data: {
      _id: 'draft-1', draftName: 'Functions', draftOrder: 1,
      commonDraft: 'A reusable overview.', customDraft: 'Remember the return value.', status: 'pending',
    } }));

    component.openAddDraft();
    component.draftName = 'Functions';
    component.customDraft = 'Remember the return value.';
    component.saveDraft();

    expect(draftsApi.createCourse).toHaveBeenCalledWith('course-123', jasmine.objectContaining({
      draftName: 'Functions', commonDraft: 'A reusable overview.', customDraft: 'Remember the return value.',
    }));
  });

  it('copies current course shared text with the custom draft, ignoring stale draft text', () => {
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    const copyText = spyOn(component, 'copyText');
    component.courseCommonDraft = 'Current shared text';

    component.copyEntireDraft({
      id: 'draft-1', draftName: 'Functions', draftOrder: 1,
      commonDraft: 'Stale shared text', customDraft: 'Custom instructions', status: 'pending',
    });

    expect(copyText).toHaveBeenCalledWith(
      'Current shared text\n\nCustom instructions',
      'Entire draft copied to clipboard.'
    );
  });

  it('imports drafts with the course shared text and ignores per-draft common text', () => {
    const component = TestBed.createComponent(CourseDetailsComponent).componentInstance;
    const draftsApi = TestBed.inject(DraftService);
    component.courseId = 'course-123';
    component.courseCommonDraft = 'Course default';
    component.bulkDraftJson = JSON.stringify([
      { name: 'Draft one', order: 1, 'common Draft': 'Ignored per-draft value' },
      { name: 'Draft two', order: 2, commonDraft: 'Ignored per-draft value' },
      { name: 'Draft three', order: 3 },
    ]);

    component.importDrafts();

    expect(draftsApi.importCourse).toHaveBeenCalledWith('course-123', [
      { draftName: 'Draft one', draftOrder: 1, commonDraft: 'Course default', customDraft: '', status: 'pending' },
      { draftName: 'Draft two', draftOrder: 2, commonDraft: 'Course default', customDraft: '', status: 'pending' },
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
