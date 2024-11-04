import { expect, type Locator, type Page } from '@playwright/test';

export class KanbanPage {
  readonly page: Page;
  readonly firstColumn: Locator;
  private columnToWork : number;
  private cardToWork : number;
  readonly columnsTitles: Locator;
  readonly modalToEdit: Locator;
  public subTasksCount: number = 0;
  public taskName: string = '';
  
  constructor(page: Page) {
    this.page = page;
    this.firstColumn = page.locator('section').nth(0);
    this.columnsTitles = page.locator('section > div > h2');
    this.modalToEdit = page.locator('div.overflow-y-auto');
    this.columnToWork = 0;
    this.cardToWork = 0;
  }

  /**
   * Navigates to the Kanban application.
   */
  async goto() {
    await this.page.goto('https://kanban-566d8.firebaseapp.com', { waitUntil: 'networkidle' });
  }

  /**
   * Clicks on a card with incompleted subtasks and that is not in the first column
   */
  async chooseCardToComplete() {
    // Base logic to choose a card
    await this.chooseWorkingColum()
    // If we have a card to work that is not in the first column and with incomplete subtasks
    if(this.columnToWork > 0 && this.cardToWork !== -1){
      await this.page.locator(`section:nth-child(${this.columnToWork+1}) article`).nth(this.cardToWork).click();      
    }
    else{
      console.warn('There are no incomplete tasks in any column (excluding first column)');
      // We could try touse column one, assuming there are cards to work
      try{
        await this.page.locator(`section:nth-child(${this.columnToWork+1}) article`).nth(this.cardToWork).click();
      }
      catch{
        throw new Error(`There are no incomplete tasks in any column`);
      }
    }

  }

  /**
   * Completes card subtasks
   */
  async completeSubTaks() {
    const subTasksCheckboxes = await this.modalToEdit.locator('label div input').all();
    // Check all subtasks and count them for verification later
    for (const checkbox of subTasksCheckboxes) {
      await checkbox.check({ force: true });
      this.subTasksCount++;
    }
  }

  /**
   * Moves task to first column
   */
  async moveTaskToColumnOne(){
    const dropdown = await this.modalToEdit.locator('div[tabindex="1"].text-sm');
    await dropdown.click();
    // First column is the first value in the dropdown
    await dropdown.locator('div.rounded div').nth(0).click();
  }

  /**
   * Closes card on edit page
   */
  async closeEditModal() {
    this.taskName = await this.modalToEdit.locator('h4').innerText();
    await this.modalToEdit.locator('h4+div').click();
    await this.page.getByText('Edit Task').click();
    await this.page.getByRole('button', { name: 'Save Changes' }).click();
  }

  /**
   * Verifies subtasks are striked through
   */
  async verifySubtasksAreStrikedThrough() {
    const subTasksLabels = await this.modalToEdit.locator('label span').all();
    for (const label of subTasksLabels) {
      const text = await label.innerText();
      const isStrikedThrough = await this.isTextStrikedThrough(label);
      expect(isStrikedThrough, `"${text}" subtask should be striked through`).toBe(true);
    }
  }

  /**
   * Verify that the card moved to the correct column and clicks on it
   */
  async clickCardInFirstColumn(){
    const cardInFirtColumn = await this.firstColumn.getByText(this.taskName).all();
    if(cardInFirtColumn.length > 0){
        // The element should be the last card added to the column
        await expect(cardInFirtColumn[cardInFirtColumn.length - 1]).toBeVisible();
        await cardInFirtColumn[cardInFirtColumn.length - 1].click();
    }
    else{
      throw new Error(`"${this.taskName}" card should be in the first column`);
    }
  }

  /**
   * Verifies that the number of completed subtasks is correct
   */
  async verifyNumberOfCompletedSubtasksIsCorrect() {
    // Expect the number to be the same as the counter this.subTasksCount
    await expect(this.modalToEdit.getByText(` Subtasks (${this.subTasksCount} of ${this.subTasksCount}) `)).toBeVisible();
  }


  /**
   * Logic to select a column to work and a card to work
   */
  private async chooseWorkingColum(){
    // Get number of tasks in each column
    const columns = await this.columnsTitles.count();
    const columnsTasksCount = new Array(columns);
    for (let i = 0; i < columns; i++) {
      const columnTaskCount = await this.getColumnTaskCount(i);
      columnsTasksCount[i] = columnTaskCount;
    }

    // Set column to work and card to work
    for (let i = 1; i < columns; i++) {
      if(columnsTasksCount[i] > 0){
        const card = await this.findIncompleteCard(i);
        this.cardToWork = card;
        if(card !== -1){
          this.columnToWork = i;
          break;
        }
      }
    }
  }

  /**
   * 
   * @param columnNumber 
   * @returns Index of an incompleted card
   */
  private async findIncompleteCard(columnNumber ?: number) {
        const columnToWork = columnNumber || this.columnToWork;
        // Select an incompleted task (card)
        const allTasks = await this.page.locator(`section:nth-child(${columnToWork+1}) article`).allInnerTexts();
        // Get indices of incomplete tasks
        const indicesOfIncompleteTasks = allTasks.map(task => {
            const match = task.match(/(\d+) of (\d+) substasks/);
            return match && parseInt(match[1]) < parseInt(match[2]);
        });
        // Find incompleted task and click
        const incompleteSubtaskIndex = indicesOfIncompleteTasks.findIndex(taskIsIncomplete => taskIsIncomplete === true);
        return incompleteSubtaskIndex;
  }

  /**
   * @returns number of tasks in the working column
   */
    private async getColumnTaskCount(columnNumber?: number): Promise<number> {
      const columnToWork = columnNumber || this.columnToWork;
      const columnText = await this.page.locator('section > div > h2').nth(columnToWork).innerText();
      const taskCountMatch = columnText.match(/\d+/);
      if (!taskCountMatch) {
        throw new Error(`Could not find task count in column No. ${columnToWork}`);
      }
      return parseInt(taskCountMatch[0], 10);
    }
    
  /**
   * 
   * @param selector 
   * @returns boolean if text is striked through
   */
  private async isTextStrikedThrough(selector: Locator): Promise<boolean> {
    const textElement = selector;
    const textDecoration = await textElement.evaluate((element) => {
      return window.getComputedStyle(element).getPropertyValue('text-decoration');
    });
    return textDecoration.includes('line-through');
  }

}