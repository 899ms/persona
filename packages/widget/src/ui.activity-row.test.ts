// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentExperience, type AgentWidgetController } from './ui';
import type { AgentWidgetConfig, AgentWidgetMessage } from './types';
let controller: AgentWidgetController;
let mount: HTMLElement;
beforeEach(() => { window.localStorage.clear(); window.scrollTo = vi.fn(); mount = document.createElement('div'); document.body.appendChild(mount); });
afterEach(() => { controller?.destroy(); document.body.replaceChildren(); vi.useRealTimers(); });
const inject = (id: string, status: 'running' | 'complete', chunks: string[] = []) => controller.injectTestMessage({ type: 'message', message: { id, role: 'assistant', content: '', createdAt: '2026-01-01T00:00:00Z', sequence: Number(id.slice(-1)), variant: 'tool', toolCall: { id, name: 'Search', status, chunks } } });
const header = (id: string) => mount.querySelector<HTMLButtonElement>(`[data-message-id="${id}"] > button`)!;
const start = (v5Defaults: boolean, toolCallDisplay: NonNullable<AgentWidgetConfig['features']>['toolCallDisplay']) => { controller = createAgentExperience(mount, { future: { v5Defaults }, apiUrl: '/test', persistState: false, launcher: { enabled: false }, features: { toolCallDisplay } }); };
describe.each([false, true])('activity UI (V5 %s)', v5Defaults => {
  it('opens on first token, collapses once, and preserves a manual decision', () => {
    start(v5Defaults, { variant: 'row', grouped: false }); vi.useFakeTimers();
    inject('tool1', 'running'); expect(header('tool1').getAttribute('aria-expanded')).toBe('false');
    inject('tool1', 'running', ['one']); expect(header('tool1').getAttribute('aria-expanded')).toBe('true');
    inject('tool1', 'complete', ['one']); vi.advanceTimersByTime(1000); expect(header('tool1').getAttribute('aria-expanded')).toBe('false');
    header('tool1').click(); expect(header('tool1').getAttribute('aria-expanded')).toBe('true');
    inject('tool1', 'complete', ['one']); vi.advanceTimersByTime(2000); expect(header('tool1').getAttribute('aria-expanded')).toBe('true');
  });
  it('cancels pending collapse on clear and supports reused message IDs', () => {
    start(v5Defaults, { variant: 'row', grouped: false }); vi.useFakeTimers();
    inject('tool1', 'running', ['one']); inject('tool1', 'complete', ['one']); controller.clearChat();
    inject('tool1', 'running', ['new']); vi.advanceTimersByTime(1100); expect(header('tool1').getAttribute('aria-expanded')).toBe('true');
    controller.destroy(); vi.advanceTimersByTime(1100);
  });
  it('groups consecutive calls with a collapsible label and staggered children', () => {
    start(v5Defaults, { variant: 'row', grouped: true, groupedMode: 'collapsible' });
    inject('tool1', 'complete', ['one']); inject('tool2', 'complete', ['two']);
    const group = mount.querySelector('[data-persona-tool-group]')!;
    expect(group.querySelector('button')?.textContent).toContain('Used 2 tools');
    const children = group.querySelectorAll<HTMLElement>('.persona-activity-group-child'); expect(children).toHaveLength(2);
    expect(children[1].style.getPropertyValue('--persona-activity-stagger')).toBe('40ms');
    const chevron = () => header('tool-group-tool1').querySelector('.persona-activity-chevron svg')!.outerHTML;
    const collapsedChevron = chevron();
    expect(header('tool-group-tool1').querySelector('svg[stroke="currentColor"]')).not.toBeNull();
    header('tool-group-tool1').click(); expect(header('tool-group-tool1').getAttribute('aria-expanded')).toBe('true');
    expect(chevron()).not.toBe(collapsedChevron);
    header('tool-group-tool1').click();
    expect(header('tool-group-tool1').getAttribute('aria-expanded')).toBe('false');
    expect(chevron()).toBe(collapsedChevron);
    controller.injectTestMessage({ type: 'message', message: { id: 'text3', sequence: 3, role: 'assistant', content: 'Break', createdAt: '2026-01-01T00:00:00Z' } });
    inject('tool4', 'complete', ['four']); expect(mount.querySelectorAll('[data-persona-tool-group]')).toHaveLength(1);
  });
  it('honors explicit static display and content renderers', () => {
    start(v5Defaults, { variant: 'row', grouped: false, expandable: false });
    inject('tool1', 'running', ['one']); expect(header('tool1').hasAttribute('data-expand-header')).toBe(false);
  });
  it('uses the same first-token lifecycle for reasoning', () => {
    controller = createAgentExperience(mount, { future: { v5Defaults }, apiUrl: '/test', persistState: false, launcher: { enabled: false }, features: { reasoningDisplay: { variant: 'row', autoCollapseDelay: 50 } } });
    vi.useFakeTimers();
    const m: AgentWidgetMessage = { id: 'r1', role: 'assistant', content: '', createdAt: '2026-01-01', variant: 'reasoning', reasoning: { id: 'r1', status: 'streaming', chunks: ['Thinking'] } };
    controller.injectTestMessage({ type: 'message', message: m }); expect(header('r1').getAttribute('aria-expanded')).toBe('true');
    controller.injectTestMessage({ type: 'message', message: { ...m, reasoning: { ...m.reasoning!, status: 'complete' } } });
    vi.advanceTimersByTime(50); expect(header('r1').getAttribute('aria-expanded')).toBe('false');
  });
});
