export interface Manifest {
  version: '1';
  previews: Array<Preview>;
}

export interface Preview {
  name: string;
  urls: Array<PreviewUrl>;
  updatedAt: string;
  commitId: string;
  author: string;
}

export interface PreviewUrl {
  os: 'linux' | 'macos' | 'win';
  url: string;
  checksum: {
    type: 'sha256';
    value: string;
  };
}
