import type { Page, Locator } from '@playwright/test';
import { BlockActionsPO } from './BlockActionsPO';
import { SelectionPO } from './SelectionPO';
import { CardModePO } from './CardModePO';
import { EditModePO } from './EditModePO';
import { ExportDialogPO } from './ExportDialogPO';

/**
 * Page Object Model for the Chat/Thread page.
 *
 * This is a façade that composes focused sub-POMs for block actions, text
 * selection, card mode, direct-edit mode, and the export dialog. The public
 * surface is kept backward-compatible with existing specs: every method that
 * used to live here still exists with the same signature. Internally, those
 * methods delegate to the relevant sub-POM.
 *
 * New specs should prefer the sub-POMs directly (e.g. `chatPage.cards`,
 * `chatPage.selection`) for clarity.
 */
export class ChatPage {
  readonly page: Page;

  readonly composer: Locator;
  readonly promptInput: Locator;
  readonly sendButton: Locator;
  readonly messages: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly blocks: Locator;

  readonly blockActions: BlockActionsPO;
  readonly selection: SelectionPO;
  readonly cards: CardModePO;
  readonly editMode: EditModePO;
  readonly exportDialog: ExportDialogPO;

  constructor(page: Page) {
    this.page = page;
    this.composer = page.locator('form.composer');
    this.promptInput = this.composer.locator('div#prompt, [role="textbox"]');
    this.sendButton = this.composer.locator('button[type="submit"]');
    this.messages = page.locator('.user-message, .assistant-message');
    this.userMessages = page.locator('.user-message');
    this.assistantMessages = page.locator('.assistant-message');
    this.blocks = page.locator('.doc-block');

    this.blockActions = new BlockActionsPO(page);
    this.selection = new SelectionPO(page);
    this.cards = new CardModePO(page);
    this.editMode = new EditModePO(page);
    this.exportDialog = new ExportDialogPO(page);
  }

  // ==================== Navigation ====================

  async goto(threadId: string): Promise<void> {
    await this.page.goto(`/t/${threadId}`);
  }

  async goToLanding(): Promise<void> {
    await this.page.goto('/');
  }

  // ==================== Blocks ====================

  getBlocks(): Locator {
    return this.blocks;
  }

  getBlock(index: number): Locator {
    return this.blocks.nth(index);
  }

  getBlockById(blockId: string): Locator {
    return this.page.locator(`[data-block-id="${blockId}"]`);
  }

  async getBlockCount(): Promise<number> {
    return await this.blocks.count();
  }

  async waitForBlockCount(count: number, timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      (expectedCount) => {
        const blocks = document.querySelectorAll('.doc-block');
        return blocks.length === expectedCount;
      },
      count,
      { timeout },
    );
  }

  /**
   * Click gutter to select a block. There is a 200ms click delay to
   * disambiguate from the double-click that creates a card.
   */
  async selectBlock(index: number): Promise<void> {
    await this.getBlock(index).locator('.gutter-handle').click();
    await this.page.waitForTimeout(250);
  }

  async selectBlockById(blockId: string): Promise<void> {
    await this.getBlockById(blockId).locator('.gutter-handle').click();
    await this.page.waitForTimeout(250);
  }

  async isBlockSelected(index: number): Promise<boolean> {
    const className = await this.getBlock(index).getAttribute('class');
    return className?.includes('is-selected') || false;
  }

  async getSelectedBlockCount(): Promise<number> {
    return await this.page.locator('.doc-block.is-selected').count();
  }

  async isBlockMuted(index: number): Promise<boolean> {
    const className = await this.getBlock(index).getAttribute('class');
    return className?.includes('is-muted') || false;
  }

  async deselectAll(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Read the rendered text of a block, excluding chips and other UI.
   */
  async getBlockText(index: number): Promise<string> {
    const block = this.getBlock(index);
    const content = block.locator('.doc-content p, .doc-content code, .doc-content li');
    const count = await content.count();
    if (count === 0) {
      return await block.locator('.doc-content').innerText();
    }
    return (await content.allInnerTexts()).join('\n').trim();
  }

  // ==================== Messages ====================

  getUserMessages(): Locator {
    return this.userMessages;
  }

  getAssistantMessages(): Locator {
    return this.assistantMessages;
  }

  async getMessageCount(): Promise<number> {
    return await this.messages.count();
  }

  // ==================== Composer text ====================

  /** Type + submit. */
  async submitPrompt(text: string): Promise<void> {
    await this.promptInput.click();
    await this.promptInput.pressSequentially(text, { delay: 5 });
    await this.sendButton.click();
  }

  /**
   * Type into the prompt without submitting. Falls back to direct DOM
   * mutation for long text (>100 chars) — faster and avoids WebKit quirks.
   */
  async typePrompt(text: string): Promise<void> {
    await this.promptInput.click();

    if (text.length > 100) {
      await this.promptInput.evaluate((el, value) => {
        el.textContent = '';
        el.textContent = value;
        el.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: value,
          }),
        );
      }, text);
    } else {
      await this.promptInput.pressSequentially(text, { delay: 5 });
    }
  }

  /** Alias. */
  async fillPrompt(text: string): Promise<void> {
    await this.typePrompt(text);
  }

  async getPromptValue(): Promise<string> {
    return await this.promptInput.evaluate((el) => el.textContent || '');
  }

  async clearPrompt(): Promise<void> {
    await this.promptInput.evaluate((el) => {
      el.textContent = '';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
  }

  /**
   * Select all in composer and press `key` (used to test strikethrough on
   * select-all + backspace in Edit mode).
   */
  async selectAllAndPress(key: string): Promise<void> {
    await this.promptInput.click();
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+a`);
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(100);
  }

  /** Wait for the send button to become enabled (streaming complete). */
  async waitForResponse(timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]');
        return button && !(button as HTMLButtonElement).disabled;
      },
      { timeout },
    );
  }

  // ==================== Block Actions (delegated) ====================

  /** Backward-compat: the controls container Locator. */
  get blockControls(): Locator {
    return this.blockActions.controls;
  }

  getBlockControl(action: string): Locator {
    return this.blockActions.get(action);
  }

  async clickBlockAction(
    action: 'ELI5' | 'Translate' | 'Expand' | 'Example' | 'Ask',
  ): Promise<void> {
    await this.blockActions.click(action);
  }

  async areBlockControlsVisible(): Promise<boolean> {
    return await this.blockActions.isVisible();
  }

  // ==================== Text Selection (delegated) ====================

  async selectTextInComposer(text: string): Promise<void> {
    await this.selection.selectInComposer(text);
  }

  getSelectionChips(blockIndex: number): Locator {
    return this.selection.getChips(blockIndex);
  }

  async clickRewrite(blockIndex: number): Promise<void> {
    await this.selection.clickRewrite(blockIndex);
  }

  async clickUndo(blockIndex: number): Promise<void> {
    await this.selection.clickUndo(blockIndex);
  }

  getUndoButton(blockIndex: number): Locator {
    return this.selection.getUndoButton(blockIndex);
  }

  // ==================== Card Mode (delegated) ====================

  async createCard(blockIndex: number): Promise<void> {
    await this.cards.createCard(blockIndex);
  }

  async isBlockInCard(blockIndex: number): Promise<boolean> {
    return await this.cards.isBlockInCard(blockIndex);
  }

  getCards(): Locator {
    return this.cards.getCards();
  }

  async getCardCount(): Promise<number> {
    return await this.cards.getCardCount();
  }

  getCardControls(cardIndex: number = 0): Locator {
    return this.cards.getCardControls(cardIndex);
  }

  async clickCardClear(cardIndex: number = 0): Promise<void> {
    await this.cards.clickClear(cardIndex);
  }

  async clickCardExport(cardIndex: number = 0): Promise<void> {
    await this.cards.clickExport(cardIndex);
  }

  // ==================== Export Dialog (delegated) ====================

  getExportCardDialog(): Locator {
    return this.exportDialog.dialog;
  }

  async isExportDialogOpen(): Promise<boolean> {
    return await this.exportDialog.isOpen();
  }

  async confirmExport(title: string): Promise<void> {
    await this.exportDialog.confirm(title);
  }

  async cancelExport(): Promise<void> {
    await this.exportDialog.cancel();
  }

  // ==================== Edit Mode (delegated) ====================

  async isModeToggleVisible(): Promise<boolean> {
    return await this.editMode.isToggleVisible();
  }

  async clickAskMode(): Promise<void> {
    await this.editMode.clickAsk();
  }

  async clickEditMode(): Promise<void> {
    await this.editMode.clickEdit();
  }

  async isInEditMode(): Promise<boolean> {
    return await this.editMode.isInEditMode();
  }

  async isInAskMode(): Promise<boolean> {
    return await this.editMode.isInAskMode();
  }

  async getSubmitButtonText(): Promise<string> {
    return await this.editMode.getSubmitButtonText();
  }

  async clickReplace(): Promise<void> {
    await this.editMode.clickReplace();
  }
}
