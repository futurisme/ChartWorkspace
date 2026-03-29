import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeScope } from '../components/layout/ThemeScope';
import { FADHILWEBLIB_THEME_PRESETS } from '../presets';

test('theme preset registry stays aligned with the public ThemeName contract', () => {
  assert.deepEqual(FADHILWEBLIB_THEME_PRESETS, ['base', 'commercial', 'game', 'utility', 'portfolio']);
});

test('ThemeScope server rendering preserves theme and syntax-derived attributes', () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      ThemeScope,
      {
        as: 'section',
        theme: 'portfolio',
        syntax: 'px:16; py:10;',
      },
      React.createElement('div', null, 'content'),
    ),
  );

  assert.match(markup, /data-fwlb-theme="portfolio"/);
  assert.match(markup, /data-slot="theme-scope"/);
  assert.match(markup, /padding-inline:16px/);
  assert.match(markup, /padding-block:10px/);
});
