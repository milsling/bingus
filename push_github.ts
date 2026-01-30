import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const { data: user } = await octokit.users.getAuthenticated();
  console.log('Authenticated as:', user.login);
  
  const repoName = 'orphan-bars';
  let repoExists = false;
  
  try {
    const { data: repo } = await octokit.repos.get({
      owner: user.login,
      repo: repoName
    });
    console.log('Repository exists:', repo.html_url);
    repoExists = true;
  } catch (e: any) {
    if (e.status === 404) {
      console.log('Creating repository...');
      const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Orphan Bars - A social platform for lyricists',
        private: false,
        auto_init: false
      });
      console.log('Repository created:', newRepo.html_url);
    } else {
      throw e;
    }
  }
  
  console.log('USERNAME=' + user.login);
  console.log('REPO=' + repoName);
}

main();
