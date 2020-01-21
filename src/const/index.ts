export enum MESSAGE_TYPE {
   CSS_FILE_MODIFIED = "CSS_FILE_MODIFIED",
   ELEMENT_EDIT = "ELEMENT_EDIT",
   init = "INIT",
   devToolsOpen = "DEVTOOLS_OPEN",
   devToolsClosed = "DEVTOOLS_CLOSED",
   CONNECTION_MADE = "CONNECTION_MADE",
   CONNECTION_LOST = "CONNECTION_LOST",
   PAGE_RELOADED = "PAGE_RELOADED",
   LOAD_FILE = "LOAD_FILE",
   TERMINATE = "TERMINATE",
   ATTRIBUTE_MODIFIED = "ATTRIBUTE_MODIFIED",
   CLOSING = "CLOSING",
   SET_PORT_FOR_NEW = "SET_PORT_FOR_NEW",
}
export type MESSAGE<T extends MESSAGE_TYPE> = {
   type: T,
   data?: MESSAGE_DATA[T],
}
export type MESSAGE_DATA = {
   [MESSAGE_TYPE.ATTRIBUTE_MODIFIED]: {
      path: Array<number>,
      value: string,
      name: string,
      id?: string, nodeName?: string,
   }
   [MESSAGE_TYPE.ELEMENT_EDIT]: {

   },
   [MESSAGE_TYPE.CSS_FILE_MODIFIED]: {
      url: string,
      content: string,
   },
   [MESSAGE_TYPE.CONNECTION_LOST]: {},
   [MESSAGE_TYPE.init]: {},
   [MESSAGE_TYPE.devToolsOpen]: {},
   [MESSAGE_TYPE.devToolsClosed]: {},
   [MESSAGE_TYPE.CONNECTION_MADE]: {},
   [MESSAGE_TYPE.CONNECTION_LOST]: {},
   [MESSAGE_TYPE.PAGE_RELOADED]: {},
   [MESSAGE_TYPE.LOAD_FILE]: {
      url: string,
      content: string,
   },
   [MESSAGE_TYPE.TERMINATE]: string,
   [MESSAGE_TYPE.CLOSING]: {},
   [MESSAGE_TYPE.SET_PORT_FOR_NEW]: {
      token: string,
      port: number,
   },
}