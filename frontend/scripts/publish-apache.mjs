import { access, cp, lstat, mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(scriptDirectory, '..')
const sourceDirectory = path.join(frontendDirectory, 'dist')
const targetDirectory = path.resolve(
  process.env.FRONTEND_PUBLISH_DIR || '/var/www/dasssest.com/html/checklist',
)
const targetParent = path.dirname(targetDirectory)
const targetName = path.basename(targetDirectory)

if (targetDirectory === path.parse(targetDirectory).root || !targetName) {
  throw new Error('FRONTEND_PUBLISH_DIR precisa apontar para um diretório de aplicação específico.')
}

const exists = async (candidate) => lstat(candidate).then(() => true).catch((error) => {
  if (error.code === 'ENOENT') return false
  throw error
})

await access(path.join(sourceDirectory, 'index.html'))
await mkdir(targetParent, { recursive: true })

const stagingParent = await mkdtemp(path.join(targetParent, `.${targetName}.staging-`))
const stagedDirectory = path.join(stagingParent, targetName)
let backupDirectory = null

try {
  await cp(sourceDirectory, stagedDirectory, {
    recursive: true,
    errorOnExist: true,
    preserveTimestamps: true,
  })
  await access(path.join(stagedDirectory, 'index.html'))

  if (await exists(targetDirectory)) {
    const targetInfo = await lstat(targetDirectory)
    if (!targetInfo.isDirectory() || targetInfo.isSymbolicLink()) {
      throw new Error(`O destino de publicação não é um diretório regular: ${targetDirectory}`)
    }
    backupDirectory = path.join(targetParent, `.${targetName}.backup-${process.pid}-${Date.now()}`)
    await rename(targetDirectory, backupDirectory)
  }

  await rename(stagedDirectory, targetDirectory)
  if (backupDirectory) await rm(backupDirectory, { recursive: true, force: true })
  await rm(stagingParent, { recursive: true, force: true })
  console.log(`Frontend publicado em ${targetDirectory}`)
} catch (error) {
  if (backupDirectory && !await exists(targetDirectory) && await exists(backupDirectory)) {
    await rename(backupDirectory, targetDirectory)
  }
  await rm(stagingParent, { recursive: true, force: true })
  throw error
}
