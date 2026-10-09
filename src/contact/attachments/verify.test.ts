import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { findTypeById } from './catalog'
import { verifyAttachmentContent } from './verify'
import { CONTENT_TYPES, buildZip } from './zip-fixture'

const type = (id: string) => findTypeById(id)!

const cleanDocx = () =>
  buildZip([
    { name: '[Content_Types].xml', content: CONTENT_TYPES },
    { name: 'word/document.xml', content: '<w:document/>' },
    {
      name: '_rels/.rels',
      content:
        '<Relationships><Relationship Type="officeDocument" Target="word/document.xml"/></Relationships>',
    },
  ])

describe('verifyAttachmentContent', () => {
  it('re-encodes images so metadata and trailing payloads are dropped', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#9c6cff' },
    })
      .png()
      .toBuffer()
    const withTrailer = Buffer.concat([png, Buffer.from('<?php system($_GET[0]); ?>')])

    const result = await verifyAttachmentContent(type('png'), withTrailer)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.sanitized).toBe(true)
      expect(result.bytes.includes(Buffer.from('<?php'))).toBe(false)
    }
  })

  it('rejects a file whose bytes do not match its declared type', async () => {
    expect(await verifyAttachmentContent(type('png'), Buffer.from('not a png at all'))).toEqual({
      ok: false,
      reason: 'type_mismatch',
    })
    expect(
      await verifyAttachmentContent(type('jpeg'), Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01])),
    ).toEqual({ ok: false, reason: 'image_invalid' })
  })

  it('rejects an empty file', async () => {
    expect(await verifyAttachmentContent(type('txt'), Buffer.alloc(0))).toEqual({
      ok: false,
      reason: 'empty_file',
    })
  })

  it('accepts a plain PDF and refuses one with active content', async () => {
    const clean = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF')
    const active = Buffer.from(
      '%PDF-1.7\n1 0 obj\n<< /OpenAction << /S /JavaScript /JS (x) >> >>\nendobj',
    )
    const lookalike = Buffer.from('%PDF-1.7\n1 0 obj\n<< /JSONData 1 >>\nendobj')

    expect((await verifyAttachmentContent(type('pdf'), clean)).ok).toBe(true)
    expect((await verifyAttachmentContent(type('pdf'), lookalike)).ok).toBe(true)
    expect(await verifyAttachmentContent(type('pdf'), active)).toEqual({
      ok: false,
      reason: 'pdf_active_content',
    })
  })

  it('accepts UTF-8 text and refuses binary or invalid encodings', async () => {
    expect((await verifyAttachmentContent(type('txt'), Buffer.from('こんにちは', 'utf8'))).ok).toBe(
      true,
    )
    expect(await verifyAttachmentContent(type('txt'), Buffer.from([0x41, 0x00, 0x42]))).toEqual({
      ok: false,
      reason: 'text_binary',
    })
    expect(await verifyAttachmentContent(type('csv'), Buffer.from([0xff, 0xfe, 0xfd]))).toEqual({
      ok: false,
      reason: 'text_encoding',
    })
  })

  it('accepts a clean OOXML document', async () => {
    expect((await verifyAttachmentContent(type('docx'), cleanDocx())).ok).toBe(true)
  })

  it('rejects a document declared with the wrong Office type', async () => {
    expect(await verifyAttachmentContent(type('xlsx'), cleanDocx())).toEqual({
      ok: false,
      reason: 'office_type_mismatch',
    })
  })

  it('rejects macros, embedded objects and external templates', async () => {
    const macro = buildZip([
      { name: '[Content_Types].xml', content: CONTENT_TYPES },
      { name: 'word/document.xml', content: '<w:document/>' },
      { name: 'word/vbaProject.bin', content: 'MZ' },
    ])
    const macroType = buildZip([
      {
        name: '[Content_Types].xml',
        content:
          '<Types><Override ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>',
      },
      { name: 'word/document.xml', content: '<w:document/>' },
    ])
    const embedded = buildZip([
      { name: '[Content_Types].xml', content: CONTENT_TYPES },
      { name: 'word/document.xml', content: '<w:document/>' },
      { name: 'word/embeddings/oleObject1.bin', content: 'x' },
    ])
    const template = buildZip([
      { name: '[Content_Types].xml', content: CONTENT_TYPES },
      { name: 'word/document.xml', content: '<w:document/>' },
      {
        name: 'word/_rels/settings.xml.rels',
        content:
          '<Relationships><Relationship Type="x/attachedTemplate" Target="http://evil.test/t.dotm" TargetMode="External"/></Relationships>',
      },
    ])

    expect(await verifyAttachmentContent(type('docx'), macro)).toEqual({
      ok: false,
      reason: 'office_active_content',
    })
    expect(await verifyAttachmentContent(type('docx'), macroType)).toEqual({
      ok: false,
      reason: 'office_macro',
    })
    expect(await verifyAttachmentContent(type('docx'), embedded)).toEqual({
      ok: false,
      reason: 'office_active_content',
    })
    expect(await verifyAttachmentContent(type('docx'), template)).toEqual({
      ok: false,
      reason: 'office_external_reference',
    })
  })

  it('rejects encrypted, zip-slip and zip-bomb archives', async () => {
    const encrypted = buildZip([{ name: '[Content_Types].xml', content: CONTENT_TYPES }], {
      encrypted: true,
    })
    const slip = buildZip([
      { name: '[Content_Types].xml', content: CONTENT_TYPES },
      { name: '../evil.txt', content: 'x' },
    ])
    const bomb = buildZip([
      { name: '[Content_Types].xml', content: CONTENT_TYPES },
      { name: 'word/document.xml', content: Buffer.alloc(30 * 1024 * 1024, 0x41) },
    ])

    expect(await verifyAttachmentContent(type('docx'), encrypted)).toEqual({
      ok: false,
      reason: 'zip_encrypted',
    })
    expect(await verifyAttachmentContent(type('docx'), slip)).toEqual({
      ok: false,
      reason: 'zip_path',
    })
    expect(await verifyAttachmentContent(type('docx'), bomb)).toEqual({
      ok: false,
      reason: 'zip_bomb',
    })
  })

  it('rejects an Office file that is not a zip at all', async () => {
    expect(await verifyAttachmentContent(type('docx'), Buffer.from('plain text'))).toEqual({
      ok: false,
      reason: 'type_mismatch',
    })
  })
})
