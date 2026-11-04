import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture } from '@angular/core/testing';

export type Answers = Readonly<Record<string, unknown>>;

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

export async function answerAll(
  fixture: ComponentFixture<unknown>,
  backend: HttpTestingController,
  answers: Answers,
): Promise<void> {
  for (let round = 0; round < 4; round++) {
    fixture.detectChanges();
    await nextTask();
    backend
      .match((request) => request.url in answers)
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush(answers[request.request.url] as never));
  }
  await fixture.whenStable();
}
