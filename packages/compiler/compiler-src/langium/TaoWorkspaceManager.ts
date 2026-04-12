import * as langium from 'langium'

/** TaoWorkspaceManager preloads std-lib .tao files as workspace documents. */
export class TaoWorkspaceManager extends langium.DefaultWorkspaceManager {
  private readonly stdLibRoot?: string

  constructor(services: langium.LangiumSharedCoreServices, stdLibRoot?: string) {
    super(services)
    this.stdLibRoot = stdLibRoot
  }

  /** loadAdditionalDocuments registers all std-lib Tao files when stdLibRoot is set. */
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
