/*
MIT License

Copyright (c) [2021] [Alonelur yinwenhan1998@gmail.com]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import { App, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';

import * as os from 'os';
interface VimImPluginSettings {
	defaultIM: string;
	obtainCmd: string;
	switchCmd: string;
	windowsDefaultIM: string;
	windowsObtainCmd: string;
	windowsSwitchCmd: string;
	macDefaultIM: string;
	macObtainCmd: string;
	macSwitchCmd: string;
}

const DEFAULT_SETTINGS: VimImPluginSettings = {
	defaultIM: '',
	obtainCmd: '',
	switchCmd: '',
	windowsDefaultIM: '',
	windowsObtainCmd: '',
	windowsSwitchCmd: '',
	macDefaultIM: "",
	macObtainCmd: "",
	macSwitchCmd: ""
}

function isEmpty(obj : any) {
  return obj && typeof obj === "object" && Object.keys(obj).length === 0;
}

export default class VimImPlugin extends Plugin {
	settings: VimImPluginSettings;
	private currentInsertIM = '';
	private previousMode = '';
	private isWinPlatform = false;
	private isMacPlatform = false;

	async onload() {
		await this.loadSettings();

		// when open a file, to initialize current
		// editor type CodeMirror5 or CodeMirror6
		this.app.workspace.on('active-leaf-change', async () => {
			const view = this.getActiveView();
			if (view) {
				const editor = this.getCodeMirror(view);
				if (editor) {
					editor.off('vim-mode-change', this.onVimModeChanged);
					editor.on('vim-mode-change', this.onVimModeChanged);
				}
			}
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		console.debug("VimIm::OS type: " + os.type());
		this.isWinPlatform = os.type() == 'Windows_NT';
		this.isMacPlatform = os.type() == 'Darwin';

		if (this.isWinPlatform) {
			this.currentInsertIM = this.settings.windowsDefaultIM;
			console.debug("VimIm Use Windows config");
		}
		else if (this.isMacPlatform) {
			this.currentInsertIM = this.settings.macDefaultIM;
			console.debug("VimIm Use Mac config");
		}
		else {
			this.currentInsertIM = this.settings.defaultIM;
			console.debug("VimIm Use Default config");
		}

	}

	private getActiveView(): MarkdownView {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	private getCodeMirror(view: MarkdownView): CodeMirror.Editor {
		// For CM6 this actually returns an instance of the object named CodeMirror from cm_adapter of codemirror_vim
		return (view as any).sourceMode?.cmEditor?.cm?.cm;
	}

	async switchToInsert() {
		const { exec } = require('child_process');
		let switchToInsert: string;
		if (this.currentInsertIM) {
			if (this.isWinPlatform) {
				switchToInsert = this.settings.windowsSwitchCmd.replace(/{im}/, this.currentInsertIM);
			}
			else if (this.isMacPlatform) {
				switchToInsert = this.settings.macSwitchCmd.replace(/{im}/, this.currentInsertIM);
			}
			else {
				switchToInsert = this.settings.switchCmd.replace(/{im}/, this.currentInsertIM);
			}
			// switchToInsert = this.isWinPlatform ?
			// 	this.settings.windowsSwitchCmd.replace(/{im}/, this.currentInsertIM) :
			// 	this.settings.switchCmd.replace(/{im}/, this.currentInsertIM);
		}

		console.debug("change to insert");
		if (typeof switchToInsert != 'undefined' && switchToInsert) {
			exec(switchToInsert, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
				console.debug(`switch im: ${switchToInsert}`);
			});
		}

		this.previousMode = "insert"
	}

	async switchToNormal() {
		const { exec } = require('child_process');
		let switchFromInsert: string;
		let obtainc: string;

		if (this.isWinPlatform) {
			switchFromInsert = this.settings.windowsSwitchCmd.replace(/{im}/, this.settings.windowsDefaultIM);
			obtainc = this.settings.windowsObtainCmd;
		}
		else if (this.isMacPlatform) {
			switchFromInsert = this.settings.macSwitchCmd.replace(/{im}/, this.settings.macDefaultIM);
			obtainc = this.settings.macObtainCmd;
		}
		else {
			switchFromInsert = this.settings.switchCmd.replace(/{im}/, this.settings.defaultIM);
			obtainc = this.settings.obtainCmd;
		}

		// const switchFromInsert = this.isWinPlatform ?
		// 	this.settings.windowsSwitchCmd.replace(/{im}/, this.settings.windowsDefaultIM) :
		// 	this.settings.switchCmd.replace(/{im}/, this.settings.defaultIM);
		// const obtainc = this.isWinPlatform ?
		// 	this.settings.windowsObtainCmd : this.settings.obtainCmd;
		console.debug("change to noInsert");
		//[0]: Obtian im in Insert Mode
		if (typeof obtainc != 'undefined' && obtainc) {
			exec(obtainc, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error(`obtain error: ${error}`);
					return;
				}
				this.currentInsertIM = stdout;
				console.debug(`obtain im: ${this.currentInsertIM}`);
			});
		}
		//[1]: Switch to default im
		if (typeof switchFromInsert != 'undefined' && switchFromInsert) {
			exec(switchFromInsert, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
				console.debug(`switch im: ${switchFromInsert}`);
			});
		}

		this.previousMode = "normal"
	}

	onVimModeChanged = async (modeObj: any) => {
		if (isEmpty(modeObj)) {
			return;
		}
		switch (modeObj.mode) {
			case "insert":
				this.switchToInsert();
				break;
			default:
				if (this.previousMode != "insert") {
					break;
				}
				this.switchToNormal();
				break;
		}
	};

	onunload() {
		console.debug("onunload");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class SampleSettingTab extends PluginSettingTab {
	plugin: VimImPlugin;

	constructor(app: App, plugin: VimImPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Vim IM Select Settings.' });

		containerEl.createEl('h3', { text: 'Settings for default platform.' });
		new Setting(containerEl)
			.setName('Default IM')
			.setDesc('IM for normal mode')
			.addText(text => text
				.setPlaceholder('Default IM')
				.setValue(this.plugin.settings.defaultIM)
				.onChange(async (value) => {
					console.debug('Default IM: ' + value);
					this.plugin.settings.defaultIM = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Obtaining Command')
			.setDesc('Command for obtaining current IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Obtaining Command')
				.setValue(this.plugin.settings.obtainCmd)
				.onChange(async (value) => {
					console.debug('Obtain Cmd: ' + value);
					this.plugin.settings.obtainCmd = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Switching Command')
			.setDesc('Command for switching to specific IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Use {im} as placeholder of IM')
				.setValue(this.plugin.settings.switchCmd)
				.onChange(async (value) => {
					console.debug('Switch Cmd: ' + value);
					this.plugin.settings.switchCmd = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Settings for Windows platform.' });
		new Setting(containerEl)
			.setName('Windows Default IM')
			.setDesc('IM for normal mode')
			.addText(text => text
				.setPlaceholder('Default IM')
				.setValue(this.plugin.settings.windowsDefaultIM)
				.onChange(async (value) => {
					console.debug('Default IM: ' + value);
					this.plugin.settings.windowsDefaultIM = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Obtaining Command on Windows')
			.setDesc('Command for obtaining current IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Obtaining Command')
				.setValue(this.plugin.settings.windowsObtainCmd)
				.onChange(async (value) => {
					console.debug('Obtain Cmd: ' + value);
					this.plugin.settings.windowsObtainCmd = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Switching Command on Windows')
			.setDesc('Command for switching to specific IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Use {im} as placeholder of IM')
				.setValue(this.plugin.settings.windowsSwitchCmd)
				.onChange(async (value) => {
					console.debug('Switch Cmd: ' + value);
					this.plugin.settings.windowsSwitchCmd = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Settings for Mac platform.' });
		new Setting(containerEl)
			.setName('Mac Default IM')
			.setDesc('IM for normal mode')
			.addText(text => text
				.setPlaceholder('Default IM')
				.setValue(this.plugin.settings.macDefaultIM)
				.onChange(async (value) => {
					console.debug('Default IM: ' + value);
					this.plugin.settings.macDefaultIM = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Obtaining Command on Mac')
			.setDesc('Command for obtaining current IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Obtaining Command')
				.setValue(this.plugin.settings.macObtainCmd)
				.onChange(async (value) => {
					console.debug('Obtain Cmd: ' + value);
					this.plugin.settings.macObtainCmd = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Switching Command on Mac')
			.setDesc('Command for switching to specific IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Use {im} as placeholder of IM')
				.setValue(this.plugin.settings.macSwitchCmd)
				.onChange(async (value) => {
					console.debug('Switch Cmd: ' + value);
					this.plugin.settings.macSwitchCmd = value;
					await this.plugin.saveSettings();
				}));
	}
}
