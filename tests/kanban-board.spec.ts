import { test } from '@playwright/test';
import { KanbanPage } from '../pageobjects/kanbanPage';

test('Edit a Kanban Card', async ({ page })  => {
  // Create a new page object and navigate to the Kanban application
  const kanbanPage = new KanbanPage(page);

  await test.step('navigate to the Kanban application', async () => {
    await kanbanPage.goto();
  });

  await test.step('choose a card to complete and not in the first column', async () => {
    await kanbanPage.chooseCardToComplete();
  });

  await test.step('complete subtasks in the card', async () => {
    await kanbanPage.completeSubTaks();
  });

  await test.step('move tasks to the first column', async () => {
    await kanbanPage.moveTaskToColumnOne();
  });

  await test.step('verify subtasks are striked through', async () => {
    await kanbanPage.verifySubtasksAreStrikedThrough();
  });

  await test.step('close card on edit page', async () => {
    await kanbanPage.closeEditModal();
  });

  await test.step('verify card is moved to the correct column', async () => {
    await kanbanPage.clickCardInFirstColumn();
  });

  await test.step('verify number of completed subtasks', async () => {
    await kanbanPage.verifyNumberOfCompletedSubtasksIsCorrect();
  });

});

