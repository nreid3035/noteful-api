const { expect } = require('chai')
const knex = require('knex')
const supertest = require('supertest')
const xss = require('xss')
const { post } = require('../src/app')
const app = require('../src/app')
const foldersRouter = require('../src/folders/folders-router')
const { makeFoldersArray } = require('./folders.fixtures')
const { makeNotesArray } = require('./notes.fixtures')

describe('Noteful Endpoints', () => {
    let db 

    before('make knex instance with test db', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })


after('disconnect from db', () => db.destroy())

before('clean the table', () => db('noteful_folders'))

afterEach('cleanup', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'))

  describe.only('GET /api/folders', () => {
    context('Given no folders', () => {
        it('responds with 200 and an empty array', () => {
            return supertest(app)
                .get('/api/folders')
                .expect(200, [])
        })
    })

    context('Given an xss attack folder', () => {
        // const maliciousFolder = {
        //     id: 911,
        //     folder_name: 'Naughty naughty very naughty <script>alert("xss");</script>' 
        // }

        // const cleanArticle = {
        //     id: 911,
        //     folder_name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;'
        // }

        // beforeEach('insert folders', () => {
        //     return db
        //         .into('noteful_folders')
        //         .insert([maliciousFolder])
        // })

        // it('removes xss attack content', () => {
        //     return supertest(app)
        //         .get('/api/articles')
        //         .expect(200)
        //         .expect(res => {
        //             res.body.forEach(folder => {
        //                 folder.folder_name = xss(folder.folder_name)
        //             })
        //             expect(res.body[0].folder_name).to.eql(cleanArticle.folder_name)   
        //         })
        // })
    })

    context('Given valid folder data', () => {
        const testFolders = makeFoldersArray()

        beforeEach('insert folders', () => {
            return db 
                .into('noteful_folders')
                .insert(testFolders)
        })

        it('GET /api/folders responds with 200 and all folders', () => {
            return supertest(app)
                .get('/api/folders')
                .expect(200, testFolders)
        })
    })
  })

  describe('POST /api/folders', () => {
    context('Given an xss attack folder', () => {
        
    })
    
    it('POST /api/folders should return 201 and the new folder', () => {
        const newFolder = {
            folder_name: 'POSTED'
        }

        return supertest(app)
            .post('/api/folders')
            .send(newFolder)
            .expect(201)
            .expect(res => {
                expect(res.body.folder_name).to.eql(newFolder.folder_name)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
            })
            .then(postRes => 
                supertest(app)
                    .get(`/api/folders/${postRes.body.id}`)
                    .expect(postRes.body)
                )
    })
  })

  describe('GET /api/folders/:folder_id', () => {
    context('Given no folders', () => {
        it('responds with 404 not found', () => {
            const folderId = 123456
            return supertest(app)
                .get(`/api/folders/${folderId}`)
                .expect(404, {
                    error: { message: 'Folder does not exist' }
                })
        })
    })

    context('Given an xss attack folder', () => {

    })

    context('Given there are valid folders', () => {
        const testFolders = makeFoldersArray()

        beforeEach('insert folders', () => {
            return db 
                .into('noteful_folders')
                .insert(testFolders)
        })

        it('GET /api/folders/:folder_id should respond with 200 and the corresponding folder', () => {
            const idToFetch = 2
            const expectedFolder = testFolders[idToFetch - 1]

            return supertest(app)
                .get(`/api/folders/${idToFetch}`)
                .expect(200, expectedFolder)
        })
    })
  })

  describe('DELETE /api/folders/:folder_id', () => {
    context('given no folders', () => {
        it('responds with 404', () => {
            const folderId = 123456
            return supertest(app)
                .delete(`/api/folders/${folderId}`)
                .expect(404, { error: { message: 'Folder does not exist' }})
        })
    })

    context('given a set of valid folders', () => {
        const testFolders = makeFoldersArray()
            
            beforeEach('insert folders', () => {
                return db 
                    .into('noteful_folders')
                    .insert(testFolders)
            })
        
        it('DELETE /api/folders/:folder_id should respond with 204 and remove the given folder', () => {
            const idToRemove = 2
            const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove)
            return supertest(app)
                .delete(`/api/folders/${idToRemove}`)
                .expect(204)
                .then(res => 
                    supertest(app)
                        .get(`/api/folders`)
                        .expect(expectedFolders)
                )
        })
    })
  })

  describe('PATCH /api/folders/:folder_id', () => {
    context('given no folders', () => {
        it('should respond with 404', () => {
            const folderId = 123456
            return supertest(app)
                .patch(`/api/folders/${folderId}`)
                .expect(404, {
                    error: { message: 'Folder does not exist'} 
                })
        })
    })

    context('given there are valid folders', () => {
        const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()

        beforeEach('insert folders and notes', () => {
            return db 
                .into('noteful_folders')
                .insert(testFolders)
                .then(() => {
                    return db 
                        .into('noteful_notes')
                        .insert(testNotes)
                })
        })

        it('PATCH /api/folders/:folder_id should respond with 204 and update the folder', () => {
            const idToUpdate = 2
            const updatedFolder = {
                folder_name: 'updated folder name'
            }   
            const expectedFolder = {
                ...testFolders[idToUpdate - 1],
                ...updatedFolder
            }

            return supertest(app)
                .patch(`/api/folders/${idToUpdate}`)
                .send(updatedFolder)
                .expect(204)
                .then(res => 
                    supertest(app)
                        .get(`/api/folders/${idToUpdate}`)
                        .expect(expectedFolder)
                    )
        })
        
        
    })
  })

  describe('GET /api/notes', () => {
    context('Given no notes', () => {
        it('responds with 200 and an empty array', () => {
            return supertest(app)
                .get('/api/notes')
                .expect(200, [])
        })
    })

    context('Given an xss attack note', () => {

    })

    context('Given valid note data', () => {
        const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()

        beforeEach('insert folders', () => {
            return db 
                .into('noteful_folders')
                .insert(testFolders)
                .then(() => {
                    return db 
                        .into('noteful_notes')
                        .insert(testNotes)
                })
        })

        it('GET /api/notes should respond with 200 and all of the notes', () => {
            return supertest(app)
                .get('/api/notes')
                .expect(200, testNotes)    
        })
    })
  })

  describe('POST /api/notes', () => {
    context('Given an xss attack note', () => {

    })

    context('Given a non-malicious note', () => {
        const testFolders = makeFoldersArray()

        beforeEach('insert folders', () => {
            return db 
                .into('noteful_folders')
                .insert(testFolders)
        })
        it('POST /api/notes should return 201 and add the note to the database', () => {
            const newNote = {
                note_name: 'Osmosis Jones',
                modified: new Date(),
                folder_id: 1,
                content: 'Lorem ipsum dolor sit amet'
            }

            return supertest(app)
                .post('/api/notes')
                .send(newNote)
                .expect(201)
                .expect(res => {
                    expect(res.body.note_name).to.eql(newNote.note_name)
                    expect(res.body.content).to.eql(newNote.content)
                })
                .then(postRes =>
                    supertest(app)
                        .get(`/api/notes/${postRes.body.id}`)
                        .expect(postRes.body)
                    )

        })
    }) 
  })

  describe('GET /api/notes/:note_id', () => {
    context('Given no notes', () => {
        it('should respond with 404 and an error message', () => {
            const noteId = 123456
            return supertest(app)
                .get(`/api/notes/${noteId}`)
                .expect(404, { error: { message: 'Note does not exist' }})
        })
    })

    context('Given an xss attack note', () => {

    })

    context('Given there are valid notes', () => {
        const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()

        beforeEach('insert folders and notes', () => {
            return db 
                .into('noteful_folders')
                .insert(testFolders)
                .then(() => {
                    return db 
                        .into('noteful_notes')
                        .insert(testNotes)
                })
        })

        it('GET /api/notes/:note_id should respond with 200 and the corresponding note', () => {
            const idToFetch = 2
            const expectedNote = testNotes[idToFetch - 1]

            return supertest(app)
                .get(`/api/notes/${idToFetch}`)
                .expect(200, expectedNote)
        })
    })
  })

  describe('DELETE /api/notes/:note_id', () => {
    context('given no notes', () => {
        it('should respond with 404', () => {
            const noteId = 123456
            return supertest(app)
                .delete(`/api/notes/${noteId}`)
                .expect(404, { error: { message: 'Note does not exist' }})
        })
    })

    context('given a set of valid notes', () => {
        const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()

        beforeEach('insert folders and notes', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
                .then(() => {
                    return db 
                        .into('noteful_notes')
                        .insert(testNotes)
                    })
        })

        it('DELETE /api/notes/:note_id should respond with 204 and delete the right note', () => {
            const idToRemove = 2
            const expectedNotes = testNotes.filter(note => note.id !== idToRemove)

            return supertest(app)
                .delete(`/api/folders/${idToRemove}`)
                .expect(204)
                .then(res => 
                    supertest(app)
                        .get('/api/notes')
                        .expect(expectedNotes)
                )
        })
    })
  })

  describe('PATCH /api/notes/:note_id', () => {
    context('given no notes', () => {
        it('should respond with 404', () => {
            const noteId = 123456
            return supertest(app)
                .patch(`/api/notes/${noteId}`)
                .expect(404, { error: { message: 'Note does not exist' }})   
        })
    })

    context('given there are valid notes', () => {
        const testFolders = makeFoldersArray()
        const testNotes = makeNotesArray()
        
        beforeEach('insert folders and notes', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
                .then(() => {
                    return db
                        .into('noteful_notes')
                        .insert(testNotes)
                })
        })

        it('PATCH /api/notes/:note_id should respond with 204 and update the note', () => {
            const idToUpdate = 2
            const updatedNote = {
                note_name: 'updated Name',
                content: 'updated lorem ipsum dolor'   
            }
            const expectedNote = {
                ...testNotes[idToUpdate - 1],
                ...updatedNote
            }
            return supertest(app)
                .patch(`/api/notes/${idToUpdate}`)
                .send(updatedNote)
                .expect(204)
                .then(res => 
                    supertest(app)
                        .get(`/api/notes/${idToUpdate}`)
                        .expect(expectedNote)
                    )
        })
    })
  })
})
  describe('App', () => {
    it('GET / responds with 200 containing "Hello World!"', () => {
        return supertest(app)
            .get('/')
            .expect(200, 'Hello World!')
    })
  })

