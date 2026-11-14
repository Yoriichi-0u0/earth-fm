// The Appearance control is a segmented group of three buttons (Auto, Light, Dark).
import type { Page } from '@playwright/test';

export type Appearance = 'auto' | 'light' | 'dark';
export const appearanceGroup = (page: Page) => page.getByRole('group', { name: 'Appearance', exact: true });
export const appearanceButton = (page: Page, value: string) =>
  page.getByRole('button', { name: `${value[0].toUpperCase()}${value.slice(1)} appearance`, exact: true });
export async function chooseAppearance(page: Page, value: string): Promise<void> {
  await appearanceButton(page, value).click();
}
