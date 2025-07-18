import { simpleGit } from 'simple-git';

export async function getCurrentBranch () {
  const git = simpleGit();
  const branchSummary = await git.branch();
  return branchSummary.current;
}

export async function getCurrentCommit () {
  const git = simpleGit();
  const commit = await git.revparse(['HEAD']);
  return commit;
}

export async function getCurrentAuthor () {
  const git = simpleGit();
  const log = await git.log({ n: 1 });
  return log.latest ? log.latest.author_name : null;
}
