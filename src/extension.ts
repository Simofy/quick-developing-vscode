import * as vscode from 'vscode';
import QuickDeveloping from './core';

export function activate(context: vscode.ExtensionContext) {
	const quickDeveloping = new QuickDeveloping()

	context.subscriptions.push(vscode.commands.registerCommand('extension.quick.developing.connect', () => {
		quickDeveloping.connect()
		vscode.window.showInformationMessage('Hello World!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.quick.developing.disconnect', () => {
		quickDeveloping.disconnect()
	}));
}

export function deactivate() { }
