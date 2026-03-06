import * as langium from 'langium'

// TaoWorkspaceManager extends the default workspace manager to load std lib files
// as additional documents, ensuring they're available for reference resolution
// regardless of whether they're inside a VS Code workspace folder.
export class TaoWorkspaceManager extends langium.DefaultWorkspaceManager {
  private readonly stdLibRoot?: string

  constructor(services: langium.LangiumSharedCoreServices, stdLibRoot?: string) {
    super(services)
    this.stdLibRoot = stdLibRoot
  }

  protected override async loadAdditionalDocuments(
    _folders: langium.WorkspaceFolder[],
    collector: (document: langium.LangiumDocument) => void,
  ): Promise<void> {
    if (!this.stdLibRoot) {
      return
    }

    const stdLibUri = langium.URI.file(this.stdLibRoot)
    const uris: langium.URI[] = []
    await this.traverseFolder(stdLibUri, uris)

    for (const uri of uris) {
      if (!this.langiumDocuments.hasDocument(uri)) {
        const doc = await this.langiumDocuments.getOrCreateDocument(uri)
        collector(doc)
      }
    }
  }
}
