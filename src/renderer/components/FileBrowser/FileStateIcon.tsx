import { FileState } from '../../../common/types/vault';

interface FileStateIconProps {
  state: FileState;
}

export function FileStateIcon({ state }: FileStateIconProps) {
  switch (state) {
    case FileState.NOT_ACCESSED:
      return <span className="w-2 h-2 rounded-full bg-gray-500" title="Not accessed" />;

    case FileState.PEEKED:
      return <span className="w-2 h-2 rounded-full bg-yellow-500" title="Peeked (frontmatter)" />;

    case FileState.READ:
      return <span className="w-2 h-2 rounded-full bg-blue-500" title="Read (full content)" />;

    case FileState.MODIFIED:
      return <span className="w-2 h-2 rounded-full bg-green-500" title="Modified" />;

    default:
      return null;
  }
}
