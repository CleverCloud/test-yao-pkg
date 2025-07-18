import { simpleGit } from 'simple-git';

/**
 * Gets the name of the current Git branch.
 * @returns {Promise<string>}
 * @throws {Error} When Git operations fail or no repository is found
 */
export async function getCurrentBranch () {
  const git = simpleGit();
  const branchSummary = await git.branch();
  return branchSummary.current;
}

/**
 * Gets the SHA hash of the current Git commit (HEAD).
 * @returns {Promise<string>}
 * @throws {Error} When Git operations fail or no repository is found
 */
export async function getCurrentCommit () {
  const git = simpleGit();
  const commit = await git.revparse(['HEAD']);
  return commit;
}

/**
 * Gets the author name of the most recent commit.
 * @returns {Promise<string|null>}
 * @throws {Error} When Git operations fail or no repository is found
 */
export async function getCurrentAuthor () {
  const git = simpleGit();
  const log = await git.log({ n: 1 });
  return log.latest ? log.latest.author_name : null;
}
