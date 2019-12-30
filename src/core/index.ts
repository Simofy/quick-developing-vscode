import * as vscode from 'vscode';
import WebSocket = require("ws");
import { type } from "os";
import { TextDecoder } from 'util';
import { compareTwoStrings } from 'string-similarity'
import { MessageChannel } from 'worker_threads';
import { parse } from 'parse5';
export enum MESSAGE_TYPE {
   CSS_FILE_MODIFIED = "CSS_FILE_MODIFIED",
   ATTRIBUTE_MODIFIED = "ATTRIBUTE_MODIFIED",
   ELEMENT_EDIT = "ELEMENT_EDIT",
   TERMINATE = "TERMINATE",
   LOAD_FILE = "LOAD_FILE",
}

export type WS_MESSAGE<T extends MESSAGE_TYPE> = {
   type: MESSAGE_TYPE,
   data: WS_RESPONSE[T],
}

export type WS_RESPONSE = {
   [MESSAGE_TYPE.CSS_FILE_MODIFIED]: {
      url: string,
      content: string,
   },
   [MESSAGE_TYPE.ELEMENT_EDIT]: {
   },
   [MESSAGE_TYPE.TERMINATE]: string,
   [MESSAGE_TYPE.LOAD_FILE]: {
      url: string,
      content: string,
   },
   [MESSAGE_TYPE.ATTRIBUTE_MODIFIED]: {
      path: Array<number>,
      value: string,
      name: string,
      id: string, nodeName: string,
   }
}

export default class QuickDeveloping {
   ws?: WebSocket.Server;
   wsHandler?: WebSocket;
   port = 1415
   constructor() {
      this.initiatedFiles = new Map()
   }
   async resolveDirectory() {
      const { workspaceFile, workspaceFolders, fs } = vscode.workspace
      if (workspaceFolders) {
         const folders = [] as Array<{
            directory: [string, vscode.FileType][],
            folder: vscode.WorkspaceFolder
         }>

         for (let i = 0; i < workspaceFolders.length; i++) {
            folders.push({
               folder: workspaceFolders[i],
               directory: await fs.readDirectory(workspaceFolders[i].uri),
            })
         }
         console.log(folders)
      }
   }
   async loadWorkingFile(data: WS_RESPONSE[MESSAGE_TYPE.LOAD_FILE]) {
      const { fs } = vscode.workspace
      if (data.url) {
         const loadedFile = this.initiatedFiles.get(data.url)
         console.log(loadedFile)

         if (!loadedFile) {
            const fileToFind = data.url.split('/').pop()
            const searchResult = await vscode.workspace.findFiles(`**/${fileToFind}`)
            let similarity = 0
            let fileUri = undefined as vscode.Uri | undefined;
            for (let i = 0; i < searchResult.length; i++) {
               const file = searchResult[i]
               const stream = await fs.readFile(file)
               var string = new TextDecoder("utf-8").decode(stream)
               if (string == data.content) {
                  this.initiatedFiles.set(data.url, {
                     file,
                     stem: data.url,
                  })
                  return file;
               } else {
                  let a = compareTwoStrings(string, data.content)
                  if (a > similarity) {
                     similarity = a;
                     fileUri = file
                  }
               }
            }
            if (fileUri) {
               if (similarity == 1) {
                  this.initiatedFiles.set(data.url, {
                     file: fileUri,
                     stem: data.url,
                  })
                  return fileUri
               } else if (similarity > 0.8) {
                  throw 0
                  //Throw if this is you'r file?
                  //or smh
               } else {
                  throw 1
                  // Strong difference between files!                    
               }
            } else {
               throw 2
               // no matching file
            }
         } else {
            return loadedFile.file
         }
      } else {
         // no url where specified
         throw 3
      }
   }
   handleMessage(message: WebSocket.Data) {
      const response = JSON.parse(message.toString()) as WS_MESSAGE<any>
      const { data } = response
      switch (response.type) {
         case MESSAGE_TYPE.CSS_FILE_MODIFIED:
            this.handleCSSFileModified(data)
            break;
         case MESSAGE_TYPE.TERMINATE:
            const message = JSON.parse(data);
            if (message.code == "TERMINATE") {
               if (this.wsHandler) {
                  this.wsHandler.send(message.token)
               }
               this.disconnect()
            }
            break;
         case MESSAGE_TYPE.ATTRIBUTE_MODIFIED:
            this.handleAttributeModified(data)
            break;
         case MESSAGE_TYPE.LOAD_FILE:
            this.loadWorkingFile(data).catch(e => console.log(e))
            break;

         default:
            break;
      }
   }
   initiatedFiles: Map<string, {
      file: vscode.Uri,
      stem: string,
   }>
   handleAttributeModified(data: WS_RESPONSE[MESSAGE_TYPE.ATTRIBUTE_MODIFIED]) {
      const { name, path, value, ...check } = data
   }
   handleFileEdit(data: WS_RESPONSE[MESSAGE_TYPE.CSS_FILE_MODIFIED], file?: vscode.Uri) {
      if(!file){
         file = this.initiatedFiles.get(data.url)?.file
      }
      // if (!this.initiatedFiles.has(data.url) && file) {

      // } else {
      //    const _file = this.initiatedFiles.get(data.url)
      //    if (_file) {
      //       file = _file.file
      //    }
      // }
      if (file) {
         vscode.window.showTextDocument(file).then((textEditor: vscode.TextEditor) => {
            textEditor.edit(editBuilder => {
               var firstLine = textEditor.document.lineAt(0);
               var lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
               var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
               editBuilder.replace(textRange, data.content)

            })
         })
      }
   }
   test() {
      const { tokenize, constructTree } = require('hyntax')

   }

   async handleCSSFileModified(data: WS_RESPONSE[MESSAGE_TYPE.CSS_FILE_MODIFIED]) {
      try {
         // const fileUri = await this.loadWorkingFile({
         //    content: "data.original",
         //    url: data.url
         // })
         this.handleFileEdit(data)
      } catch (e) {
         console.error("No file", e)
      }

      // const { fs } = vscode.workspace
      // if (data.url) {

      //    if (!this.initiatedFiles.has(data.url)) {
      //       const fileToFind = data.url.split('/').pop()
      //       const searchResult = await vscode.workspace.findFiles(`**/${fileToFind}`)
      //       let similarity = 0
      //       let fileUri = undefined as vscode.Uri | undefined;
      //       for (let i = 0; i < searchResult.length; i++) {
      //          const file = searchResult[i]
      //          const stream = await fs.readFile(file)
      //          var string = new TextDecoder("utf-8").decode(stream)
      //          if (string == data.original) {
      //             this.handleFileEdit(data, file)
      //             return;
      //          } else {
      //             let a = compareTwoStrings(string, data.original)
      //             if (a > similarity) {
      //                similarity = a;
      //                fileUri = file
      //             }
      //          }
      //       }
      //       if (fileUri) {
      //          if (similarity == 1) {
      //             this.handleFileEdit(data, fileUri)
      //             return
      //          } else if (similarity > 0.8) {
      //             //Throw if this is you'r file?
      //             //or smh
      //          } else {
      //             // Strong difference between files!                    
      //          }
      //       } else {
      //          // no matching file
      //       }
      //    } else {
      //       this.handleFileEdit(data)
      //    }
      // }
   }
   handleConnection(ws: WebSocket) {
      ws.on('message', this.handleMessage.bind(this));
      ws.send('something');
      this.wsHandler = ws;
   }
   handleErrorMessageResponse(response: string | undefined) {
      if (response == "Yes") {
         const ws = new WebSocket(`ws://localhost:${this.port}`)
         const token = Math.random().toString(16).split('.').pop()
         ws.on("open", () => ws.send(JSON.stringify({
            type: MESSAGE_TYPE.TERMINATE,
            data: token,
         } as WS_MESSAGE<MESSAGE_TYPE.TERMINATE>)))
         ws.on("message",
            data => {
               if (data == token) {
                  ws.terminate()
                  setTimeout(this.connect.bind(this), 100)
               }
            })
      }
   }
   handleError(error: any) {
      const { code } = error
      if (code === "EADDRINUSE") {
         let a = [] as string[]
         vscode.window
            .showErrorMessage(`Another Quick Developing session is running!\n
            Make this main?`, "Yes", "No")
            .then(this.handleErrorMessageResponse.bind(this));
      } else {
         vscode.window.showErrorMessage('Unexpected error!');
      }
   }
   onConnection() {
      if (this.ws) {
         vscode.window.showInformationMessage('Quick Developing session is live!');
         this.ws.on('connection', this.handleConnection.bind(this));
      }
   }
   connect() {
      //
      this.ws = new WebSocket.Server({
         port: this.port,
      }, this.onConnection.bind(this));
      this.ws.on('error', this.handleError.bind(this))
   }
   disconnect() {
      if (this.ws) {
         this.wsHandler && this.wsHandler.send("CLOSING")
         this.wsHandler = undefined
         this.ws.close(this.cleanUp.bind(this))
      }
   }
   private cleanUp(err?: Error | undefined) {
      if (err) {

      } else {
         vscode.window.showInformationMessage('Quick Developing session close!');
      }
   }
}