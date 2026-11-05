import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PipelineTokenView } from '../api/models';
import { Auth } from '../auth/auth';
import { answerClusterStatus } from '../testing/backend';
import { aPipelineToken, aSignedInUser } from '../testing/builders';
import { cellsOfRow, settle, textOf } from '../testing/dom';
import { PipelineTokenList } from './pipeline-token-list';

async function render(tokens: PipelineTokenView[]): Promise<ComponentFixture<PipelineTokenList>> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  TestBed.inject(Auth).user.set(aSignedInUser({ role: 'administrator' }));
  const fixture = TestBed.createComponent(PipelineTokenList);
  const backend = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  backend.expectOne('/api/pipeline-tokens/list').flush(tokens);
  await answerClusterStatus(backend);
  await settle(fixture);
  return fixture;
}

describe('PipelineTokenList', () => {
  it('lists every token with its stack, last use and expiry', async () => {
    const fixture = await render([
      aPipelineToken(),
      aPipelineToken({
        id: 'token-2',
        name: 'blog-deploy',
        stack: 'blog',
        lastUsedAt: new Date().toISOString(),
      }),
    ]);

    expect(cellsOfRow(fixture, 'shop-deploy').slice(0, 5)).toEqual([
      'shop-deploy',
      'shop',
      expect.stringContaining('ana@example.com'),
      'Never',
      '2027-01-30',
    ]);
    expect(cellsOfRow(fixture, 'blog-deploy')[3]).toBe('now');
  });

  it('says where tokens come from when there are none', async () => {
    const fixture = await render([]);

    expect(textOf(fixture)).toContain('No pipeline tokens');
  });
});
