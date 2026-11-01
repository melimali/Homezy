/**
 * react-native'in Text, TextInput ve Alert bileşenlerini sarar: İngilizce iken içindeki metinler
 * `tx()` ile çevrilir. Böylece her ekranın metni tek tek değiştirilmeden çevrilir. _layout.tsx en üstte yükler.
 */
import { createElement, type ComponentType, type ReactNode } from 'react';
import type * as RNTypes from 'react-native';

import { tx } from './runtime';

function translateChildren(children: unknown): unknown {
  if (typeof children === 'string') return tx(children);
  if (Array.isArray(children)) {
    if (children.every(c => typeof c === 'string' || typeof c === 'number')) {
      const joined = children.join('');
      const out = tx(joined);
      if (out !== joined) return out;
      return children;
    }
    return children.map(c => (typeof c === 'string' ? tx(c) : c));
  }
  return children;
}

let done = false;
export function installTranslationPatch() {
  if (done) return;
  done = true;
  // `import * as` kopya verir; gerçek modül nesnesini doğrudan al.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof RNTypes;
  const mod = RN as unknown as Record<string, unknown>;
  const OrigText = RN.Text as unknown as ComponentType<Record<string, unknown>>;
  const OrigInput = RN.TextInput as unknown as ComponentType<Record<string, unknown>>;

  const PText = ({ children, ...props }: Record<string, unknown>) =>
    createElement(
      OrigText,
      {
        ...props,
        ...(typeof props.accessibilityLabel === 'string' ? { accessibilityLabel: tx(props.accessibilityLabel) } : null),
      },
      translateChildren(children) as ReactNode,
    );
  const PInput = (props: Record<string, unknown>) =>
    createElement(OrigInput, {
      ...props,
      ...(typeof props.placeholder === 'string' ? { placeholder: tx(props.placeholder) } : null),
    });
  // ref ve statik üyeler (ör. TextInput.State) için özellikleri taşı.
  Object.assign(PText, OrigText);
  Object.assign(PInput, OrigInput);
  PText.displayName = 'Text';
  PInput.displayName = 'TextInput';

  const origAlert = RN.Alert.alert.bind(RN.Alert);
  const PAlert = Object.assign(Object.create(RN.Alert), {
    alert: (title: string, message?: string, buttons?: RNTypes.AlertButton[], options?: RNTypes.AlertOptions) =>
      origAlert(
        tx(title),
        message === undefined ? undefined : tx(message),
        buttons?.map(b => ({ ...b, text: b.text === undefined ? b.text : tx(b.text) })),
        options,
      ),
  });

  const define = (name: string, value: unknown) => {
    try {
      Object.defineProperty(mod, name, { configurable: true, enumerable: true, get: () => value });
    } catch {
      /* salt okunur ise çeviri sessizce kapalı kalır */
    }
  };
  define('Text', PText);
  define('TextInput', PInput);
  define('Alert', PAlert);
}
