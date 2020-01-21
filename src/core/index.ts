import * as vscode from 'vscode';
import WebSocket = require("ws");
import { type } from "os";
import { TextDecoder } from 'util';
import { compareTwoStrings } from 'string-similarity'
import { MessageChannel } from 'worker_threads';
import { parse } from 'parse5';
import { MESSAGE_TYPE, MESSAGE_DATA, MESSAGE } from '../const';

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
   async loadWorkingFile(data: MESSAGE_DATA[MESSAGE_TYPE.LOAD_FILE]) {
      const { fs } = vscode.workspace
      if (data.url) {
         console.log(data.url)
         const loadedFile = this.initiatedFiles.get(data.url)
         if (!loadedFile) {
            const fileToFind = data.url.split('/').pop()
            const searchResult = await vscode.workspace.findFiles(`**/${fileToFind}`)
            let similarity = 0
            let fileUri = undefined as vscode.Uri | undefined;
            for (let i = 0; i < searchResult.length; i++) {
               const file = searchResult[i]
               const stream = await fs.readFile(file)
               let string = new TextDecoder("utf-8").decode(stream)
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
      const response = JSON.parse(message.toString()) as MESSAGE<any>
      const { data } = response
      switch (response.type) {
         case MESSAGE_TYPE.CSS_FILE_MODIFIED: {
            this.handleCSSFileModified(data)
            break;
         }
         case MESSAGE_TYPE.TERMINATE: {
            if (this.wsHandler) {
               this.wsHandler.send(data)
            }
            this.disconnect()
            break;
         }
         case MESSAGE_TYPE.SET_PORT_FOR_NEW: {
            break;
         }
         case MESSAGE_TYPE.ATTRIBUTE_MODIFIED: {
            this.handleAttributeModified(data)
            break;
         }
         case MESSAGE_TYPE.LOAD_FILE: {
            this.loadWorkingFile(data).catch(e => console.log(e))
            break;
         }
         default:
            break;
      }
   }
   initiatedFiles: Map<string, {
      file: vscode.Uri,
      stem: string,
   }>
   handleAttributeModified(data: MESSAGE_DATA[MESSAGE_TYPE.ATTRIBUTE_MODIFIED]) {
      const { name, path, value, ...check } = data
   }
   handleFileEdit(data: MESSAGE_DATA[MESSAGE_TYPE.CSS_FILE_MODIFIED], file?: vscode.Uri) {
      if (!file) {
         //gauname failo nuorodą iš ryšių lentelės
         file = this.initiatedFiles.get(data.url)?.file
      }
      if (file) {
         //Kad būtų galima keisti tekstą neišsaugojant, reikia atidaryti redaktorių
         vscode.window.showTextDocument(file).then((textEditor: vscode.TextEditor) => {
            textEditor.edit(editBuilder => {
               let firstLine = textEditor.document.lineAt(0);
               let lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
               let textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
               //Pakeičiame visą tekstą su nauju
               editBuilder.replace(textRange, data.content)

            })
         })
      }
   }
   test() {
      const { tokenize, constructTree } = require('hyntax')

   }

   async handleCSSFileModified(data: MESSAGE_DATA[MESSAGE_TYPE.CSS_FILE_MODIFIED]) {
      try {
         this.handleFileEdit(data)
      } catch (e) {
         console.error("No file", e)
      }
   }
   handleConnection(ws: WebSocket) {
      ws.on('message', this.handleMessage.bind(this));
      ws.send('something');
      this.wsHandler = ws;
   }
   handleErrorMessageResponse(response?: string) {
      if (response == "Yes") {
         const ws = new WebSocket(`ws://localhost:${this.port}`)
         const token = Math.random().toString(16).split('.').pop()
         ws.on("open", () => ws.send(JSON.stringify({
            type: MESSAGE_TYPE.TERMINATE,
            data: token,
         } as MESSAGE<MESSAGE_TYPE.TERMINATE>)))
         ws.on("message",
            data => {
               if (data == token) {
                  ws.terminate()
                  setTimeout(this.connect.bind(this), 100)
               }
            })
      } else {
         const ws = new WebSocket(`ws://localhost:${this.port}`)
         const token = Math.random().toString(16).split('.').pop()
         const newPort = this.port + 1;
         ws.on("open", () => ws.send(JSON.stringify({
            type: MESSAGE_TYPE.SET_PORT_FOR_NEW,
            data: {
               token,
               port: newPort,
            },
         } as MESSAGE<MESSAGE_TYPE.SET_PORT_FOR_NEW>)))
         ws.on("message",
            message => {
               const { token, port } = JSON.parse(message.toString()) as MESSAGE_DATA[MESSAGE_TYPE.SET_PORT_FOR_NEW]
               if (token == token) {
                  ws.terminate()
                  this.port = port;
                  setTimeout(this.connect.bind(this), 100)
               }
            })

      }
   }
   handleError(error: any) {
      const { code } = error
      if (code === "EADDRINUSE") {
         vscode.window
            .showErrorMessage(`Another Quick Developing session is running!\n
         Make this main?`, "Yes", "No")
            .then(this.handleErrorMessageResponse.bind(this));
      } else {
         // this.handleErrorMessageResponse()
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
         this.wsHandler && this.wsHandler.send(MESSAGE_TYPE.CLOSING)
         this.wsHandler = undefined
         this.ws.close(this.cleanUp.bind(this))
      }
   }
   private cleanUp(err?: Error | undefined) {
      if (err) {

      } else {
         vscode.window.showInformationMessage('Quick Developing session closed!');
      }
   }
}