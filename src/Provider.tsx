// @flow

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import config from './config';
import Logger from './Logger';
import I18n, { I18nContext } from './I18n';
import { TranslationMap, FileResponse } from './fileSource';

// -------------------------------------------------------------------------------------------------

export type I18nProviderProps = {
  source: (locale: string) => Promise<FileResponse>;
  watchRegister?: ({}) => void;
  children: React.ReactNode;
  locale?: string;
};

interface KeyRegister {
  [key: string]: string;
}

// -------------------------------------------------------------------------------------------------

const defaultMatch = (search: string) => {
  return search ? {} : null;
};

const defaultGet = (key: string) => {
  return key ? null : '';
};

export interface I18nContextValue {
  toString: (component: React.ReactElement<typeof I18n>) => string;
  match: (search: string) => null | TranslationMap;
  registerKey: (key: string, value: any) => void;
  unregisterKey: (key: string) => void;
  get: (key: string) => null | string;
  locale: string;
}

// -------------------------------------------------------------------------------------------------

export default class I18nProvider extends React.PureComponent<I18nProviderProps, I18nContextValue> {
  register: KeyRegister = {};
  mounted: boolean = false;

  // // --------------------------------------------------------------------------------------------

  constructor(props: I18nProviderProps) {
    super(props);
    const isProd = process.env.NODE_ENV === 'production';
    this.state = {
      unregisterKey: isProd ? null : this.unregisterKey.bind(this),
      registerKey: isProd ? null : this.registerKey.bind(this),
      locale: props.locale || config.DEFAULT_LOCALE,
      toString: this.renderToString.bind(this),
      match: defaultMatch,
      get: defaultGet
    };
  }

  // // --------------------------------------------------------------------------------------------

  registerKey = (key: string, def: any): void => {
    this.register[key] = def;
    this.props.watchRegister && this.props.watchRegister({ ...this.register });
  };

  // // --------------------------------------------------------------------------------------------

  unregisterKey = (key: string): void => {
    delete this.register[key];
    this.props.watchRegister && this.props.watchRegister({ ...this.register });
  };

  // // --------------------------------------------------------------------------------------------

  renderToString = (component: React.ReactElement<typeof I18n>): string => {
    try {
      return ReactDOMServer.renderToString(
        <I18nContext.Provider value={this.state}>{component}</I18nContext.Provider>
      );
    } catch (e) {
      Logger.notify(e);
      return '';
    }
  };

  // // --------------------------------------------------------------------------------------------

  componentDidMount(): void {
    this.mounted = true;
    this.loadSource(this.state.locale);
  }

  // // --------------------------------------------------------------------------------------------

  componentWillUnmount(): void {
    this.mounted = false;
  }

  // // --------------------------------------------------------------------------------------------

  componentDidUpdate(): void {
    if (this.props.locale && this.props.locale !== this.state.locale) {
      this.loadSource(this.props.locale);
    }
  }

  // // --------------------------------------------------------------------------------------------

  loadSource = (locale: string): void => {
    this.props.source &&
      this.props
        .source(locale)
        .then(({ get, match }) => {
          this.mounted && this.setState({ locale, get, match });
        })
        .catch(() => {
          Logger.notify(new Error('Error loading locale source'));
        });
  };

  // // --------------------------------------------------------------------------------------------

  render(): React.ReactNode {
    return <I18nContext.Provider value={this.state}>{this.props.children}</I18nContext.Provider>;
  }
}

export { I18nContext };
