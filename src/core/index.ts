import * as vscode from 'vscode';
import WebSocket = require("ws");
import { type } from "os";
import { TextDecoder } from 'util';
import { compareTwoStrings } from 'string-similarity'
import { MessageChannel } from 'worker_threads';
export enum MESSAGE_TYPE {
   CSS_FILE_MODIFIED = "CSS_FILE_MODIFIED",
   ATTRIBUTE_MODIFIED = "ATTRIBUTE_MODIFIED",
   ELEMENT_EDIT = "ELEMENT_EDIT",
   TERMINATE = "TERMINATE",
}

export type WS_MESSAGE<T extends MESSAGE_TYPE> = {
   type: MESSAGE_TYPE,
   data: WS_RESPONSE[T],
}

export type WS_RESPONSE = {
   [MESSAGE_TYPE.CSS_FILE_MODIFIED]: {
      url: string,
      content: string,
      original: string,
   },
   [MESSAGE_TYPE.ATTRIBUTE_MODIFIED]: {
   },

   [MESSAGE_TYPE.ELEMENT_EDIT]: {
   },
   [MESSAGE_TYPE.TERMINATE]: string,
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
   handleMessage(message: WebSocket.Data) {
      const response = JSON.parse(message.toString()) as WS_MESSAGE<any>
      const { data } = response
      switch (response.type) {
         case MESSAGE_TYPE.CSS_FILE_MODIFIED:
            this.handleCSSFileModified(data)
            break;
         case MESSAGE_TYPE.TERMINATE:
               const message = JSON.parse(data);
               if(message.code == "TERMINATE"){
                  if(this.wsHandler){
                     this.wsHandler.send(message.token)
                  }
                  this.disconnect()
               }
            break;
         default:
            break;
      }
   }
   initiatedFiles: Map<string, {
      file: vscode.Uri,
      stem: string,
      original: string,
   }>
   handleFileEdit(data: WS_RESPONSE[MESSAGE_TYPE.CSS_FILE_MODIFIED], file?: vscode.Uri) {
      if (!this.initiatedFiles.has(data.url) && file) {
         this.initiatedFiles.set(data.url, {
            file,
            original: data.original,
            stem: data.url,
         })
      } else {
         const _file = this.initiatedFiles.get(data.url)
         if (_file) {
            file = _file.file
         }
      }
      if (file) {
         vscode.window.showTextDocument(file).then((textEditor: vscode.TextEditor) => {
            textEditor.edit(editBuilder => {
               var firstLine = textEditor.document.lineAt(0);
               var lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
               var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
               editBuilder.replace(textRange, data.content)
               console.log(textRange)
            })
         })
      }
   }

   async handleCSSFileModified(data: WS_RESPONSE[MESSAGE_TYPE.CSS_FILE_MODIFIED]) {
      const { fs } = vscode.workspace
      if (data.url) {

         if (!this.initiatedFiles.has(data.url)) {
            const fileToFind = data.url.split('/').pop()
            const searchResult = await vscode.workspace.findFiles(`**/${fileToFind}`)
            let similarity = 0
            let fileUri = undefined as vscode.Uri | undefined;
            for (let i = 0; i < searchResult.length; i++) {
               const file = searchResult[i]
               const stream = await fs.readFile(file)
               var string = new TextDecoder("utf-8").decode(stream)
               if (string == data.original) {
                  this.handleFileEdit(data, file)
                  return;
               } else {
                  let a = compareTwoStrings(string, data.original)
                  if (a > similarity) {
                     similarity = a;
                     fileUri = file
                  }
               }
            }
            if (fileUri) {
               if (similarity == 1) {
                  this.handleFileEdit(data, fileUri)
                  return
               } else if (similarity > 0.8) {
                  //Throw if this is you'r file?
                  //or smh
               } else {
                  // Strong difference between files!                    
               }
            } else {
               // no matching file
            }
         } else {
            this.handleFileEdit(data)
         }
      }
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