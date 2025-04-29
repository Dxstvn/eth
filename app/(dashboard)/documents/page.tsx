import { auth } from "@clerk/nextjs/server"
import { FileUpload } from "@/components/file-upload"

const DocumentsPage = () => {
  const { userId } = auth()

  return (
    <div className="h-full p-4 space-y-2">
      <FileUpload endpoint="documents" />
    </div>
  )
}

export default DocumentsPage
