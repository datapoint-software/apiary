import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { backgroundRequests, UserActivity } from './user-activity';

const aMinuteAndASecond = 61_000;

function setUp() {
  vi.useFakeTimers({ toFake: ['Date'] });
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([backgroundRequests])),
      provideHttpClientTesting(),
    ],
  });
  TestBed.inject(UserActivity);
  return { http: TestBed.inject(HttpClient), backend: TestBed.inject(HttpTestingController) };
}

function backgroundHeader(http: HttpClient, backend: HttpTestingController): string | null {
  http.post('/api/routes/list', {}).subscribe();
  return backend.expectOne('/api/routes/list').request.headers.get('X-Apiary-Background');
}

afterEach(() => vi.useRealTimers());

describe('backgroundRequests', () => {
  it('sends requests as the user’s own while they are active', () => {
    const { http, backend } = setUp();

    expect(backgroundHeader(http, backend)).toBeNull();
  });

  it('marks requests as background after a minute without input', () => {
    const { http, backend } = setUp();

    vi.advanceTimersByTime(aMinuteAndASecond);

    expect(backgroundHeader(http, backend)).toBe('1');
  });

  it('counts a key press as activity', () => {
    const { http, backend } = setUp();
    vi.advanceTimersByTime(aMinuteAndASecond);

    TestBed.inject(DOCUMENT).dispatchEvent(new KeyboardEvent('keydown'));

    expect(backgroundHeader(http, backend)).toBeNull();
  });
});
