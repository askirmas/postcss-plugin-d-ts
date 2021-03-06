import {statSync, appendFileSync, unlinkSync, existsSync} from 'fs'
import {resolve} from 'path'
import run, { rfsl, rfs } from './test-runner'

const FALSY = ["", undefined, null, false, 0,]
, suitFolder = "__unit__"
, from = `${suitFolder}/index.css`
, fromContent = rfs(from)
, dtsPath = `${from}.d.ts`
, modifiedTime = () => statSync(dtsPath).mtimeMs

let dtsContent: Readonly<string[]>
beforeAll(async () => {
  const dtsPath = `${from}.d.ts`
  existsSync(dtsPath) && unlinkSync(dtsPath)
  await run({from})
  dtsContent = rfsl(dtsPath)
})


describe('features', () => {
  it('falsy file', async () => await Promise.all(
    //@ts-expect-error
    FALSY.map(from => run({from, input: ".class{}"}))
  ))

  describe('content overwrite', () => {
    beforeAll(async () => {
      existsSync(dtsPath) && unlinkSync(dtsPath)
      await run({from})
      dtsContent = rfsl(dtsPath)
    })

    it('no overwrite on same content', async () => {
      const modified = modifiedTime()
      await run({from})
      expect(modifiedTime()).toBe(modified)
    })

    it('overwrite after append new line', async () => {
      appendFileSync(dtsPath, "\n")
      const modified = modifiedTime()
      await run({from})
      expect(modifiedTime()).toBeGreaterThan(modified)
    })

    it('overwrite after append new content', async () => {
      appendFileSync(dtsPath, "/**/")
      const modified = modifiedTime()
      await run({from})
      expect(modifiedTime()).toBeGreaterThan(modified)
    })

    it('no overwrite on template without last newline', async () => {
      const modified = modifiedTime()
      await run({from}, {"template": `${suitFolder}/template_without_last_newline.d.ts`})
      expect(modifiedTime()).toBe(modified)
    })
  })
})

describe('options', () => {

  describe('identifierPattern', () => {
    const runOpts = {
      from,
      input: fromContent
    }

    it('not global pattern', async () => await run(
      {...runOpts, errorsCount: 1},
      {identifierPattern: /\.([\w-]+)/}
    ))
  })

  describe("destination", () => {
    it('destionation here', async () => {
      const destination = {}
      await run({from}, {destination})
      expect(
        destination
      ).toStrictEqual({
        [resolve(from)]: dtsContent
      })
    })

    it('falsy destination', async () => await Promise.all(
      //@ts-expect-error
      FALSY.map(destination => destination !== false && run({from, errorsCount: 1}, {destination}))
    ))
  })
})
