import * as React from 'react';
import './CommandBar.scss';
import { FocusZone, FocusZoneDirection } from '../../utilities/focus/index';
import EventGroup from '../../utilities/eventGroup/EventGroup';
import { default as ContextualMenu, DirectionalHint } from '../ContextualMenu/index';
import { css } from '../../utilities/css';

const OVERFLOW_KEY = 'overflow';

let _instance = 0;

export interface ICommandBarItem {
  key: string;
  name: string;
  icon?: string;
  onClick?: (ev: React.MouseEvent) => void;
  items?: ICommandBarItem[];
}

export interface ICommandBarProps {
  isSearchBoxVisible?: boolean;
  searchPlaceholderText?: string;

  items: ICommandBarItem[];
  overflowItems?: ICommandBarItem[];
  farItems?: ICommandBarItem[];
}

export interface ICommandBarState {
  renderedItems?: ICommandBarItem[];
  renderedOverflowItems?: ICommandBarItem[];
  expandedMenuItemKey?: string;
  expandedMenuId?: string;
  contextualMenuItems?: ICommandBarItem[];
  contextualMenuTarget?: HTMLElement;
  renderedFarItems?: ICommandBarItem[];
}

export class CommandBar extends React.Component<ICommandBarProps, ICommandBarState> {
  public static defaultProps = {
    items: [],
    overflowItems: [],
    farItems: []
  };

  private _instanceId: string;
  private _overflowWidth: number;
  private _commandItemWidths: { [key: string]: number };
  private _events: EventGroup;

  constructor(props: ICommandBarProps) {
    super(props);

    this.state = {
      renderedItems: props.items || [],
      renderedOverflowItems: null,
      contextualMenuItems: null,
      renderedFarItems: props.farItems || null,
    };

    this._instanceId = 'CommandBar-' + (_instance++) + '-';
    this._events = new EventGroup(this);
    this._commandItemWidths = {};

    this._onItemClick = this._onItemClick.bind(this);
    this._onOverflowClick = this._onOverflowClick.bind(this);
    this._onContextMenuDismiss = this._onContextMenuDismiss.bind(this);
  }

  public componentDidMount() {
    this._updateItemMeasurements();
    this._updateRenderedItems();

    this._events.on(window, 'resize', this._updateRenderedItems);
  }

  public componentWillUnmount() {
    this._events.dispose();
  }

  public render() {
    const { isSearchBoxVisible, searchPlaceholderText, items, farItems } = this.props;
    const { renderedItems, contextualMenuItems, expandedMenuItemKey, expandedMenuId, renderedOverflowItems, contextualMenuTarget, renderedFarItems } = this.state;
    let searchBox;

    if (isSearchBoxVisible) {
      searchBox = (
        <div className='ms-CommandBarSearch' ref='searchSurface'>
          <input className='ms-CommandBarSearch-input' type='text' placeholder={ searchPlaceholderText } />
          <div className='ms-CommandBarSearch-iconWrapper ms-CommandBarSearch-iconSearchWrapper'>
            <i className='ms-Icon ms-Icon--search'></i>
          </div>
          <div className='ms-CommandBarSearch-iconWrapper ms-CommandBarSearch-iconClearWrapper ms-font-s'>
            <i className='ms-Icon ms-Icon--x'></i>
          </div>
        </div>
      );
    }

    return (
      <div className='ms-CommandBar' ref='commandBarRegion'>
        { searchBox }
        <FocusZone direction={ FocusZoneDirection.horizontal }>
          <div className='ms-CommandBar-primaryCommands' ref='commandSurface'>
            { renderedItems.map((item, index) => (
            <div className='ms-CommandBarItem' key={ item.key } ref={ item.key }>
              <button
                id={ this._instanceId + item.key }
                className={ css('ms-CommandBarItem-link', { 'is-expanded': (expandedMenuItemKey === item.key) }) }
                onClick={ this._onItemClick.bind(this, item) }
                data-command-key={ index }
                aria-haspopup={ !!(item.items && item.items.length) }
              >
                <span className={ `ms-CommandBarItem-icon ms-Icon ms-Icon--${ item.icon }` }></span>
                <span className='ms-CommandBarItem-commandText ms-font-m ms-font-weight-regular'>{ item.name }</span>
                { (item.items && item.items.length) ? (
                <i className='ms-CommandBarItem-chevronDown ms-Icon ms-Icon--chevronDown' />
                ) : ( null ) }
              </button>
            </div>
            )).concat((!renderedOverflowItems || renderedOverflowItems.length) ? [
            <div className='ms-CommandBarItem' key={ OVERFLOW_KEY } ref={ OVERFLOW_KEY }>
              <button id={ this._instanceId + OVERFLOW_KEY } className={ css('ms-CommandBarItem-link', { 'is-expanded': (expandedMenuItemKey === OVERFLOW_KEY) }) } onClick={ this._onOverflowClick }>
                <i className='ms-CommandBarItem-overflow ms-Icon ms-Icon--ellipsis' />
              </button>
            </div>
            ] : []) }
          </div>
          <div className='ms-CommandBar-sideCommands' ref='farCommandSurface'>
            { renderedFarItems.map((item, index) => (
            <div className='ms-CommandBarItem' key={ item.key } ref={ item.key }>
              <button
                id={ this._instanceId + item.key }
                className={ css('ms-CommandBarItem-link', { 'is-expanded': (expandedMenuItemKey === item.key) }) }
                onClick={ this._onItemClick.bind(this, item) }
                data-command-key={ index }
                aria-haspopup={ !!(item.items && item.items.length) }
              >
                <span className={ `ms-CommandBarItem-icon ms-Icon ms-Icon--${ item.icon }` }></span>
                <span className='ms-CommandBarItem-commandText ms-font-m ms-font-weight-regular'>{ item.name }</span>
                { (item.items && item.items.length) ? (
                <i className='ms-CommandBarItem-chevronDown ms-Icon ms-Icon--chevronDown' />
                )  : ( null ) }
              </button>
            </div>
            )) }
          </div>
        </FocusZone>
        { (contextualMenuItems) ?
        (<ContextualMenu
          menuKey={ expandedMenuItemKey }
          labelElementId={ expandedMenuId }
          className='ms-CommandBar-menuHost'
          items={ contextualMenuItems }
          targetElement={ contextualMenuTarget }
          onDismiss={ this._onContextMenuDismiss }
          isBeakVisible={ true }
          gapSpace={ 8 }
          typeAlignmentHint={DirectionalHint.vertical}
          horizontalAlignmentHint={DirectionalHint.auto}
          verticalAlignmentHint={DirectionalHint.bottom}
        />
        ) : (null)}
      </div>
    );
  }

  private _updateItemMeasurements() {
    // the generated width for overflow is 35 in chrome, 38 in IE, but the actual value is 41.5
    this._overflowWidth = (this.refs[OVERFLOW_KEY] as HTMLElement).getBoundingClientRect().width + 6.5;

    for (let i = 0; i < this.props.items.length; i++) {
      let item = this.props.items[i];

      if (!this._commandItemWidths[item.key]) {
        let el = this.refs[item.key] as HTMLElement;

        this._commandItemWidths[item.key] = el.getBoundingClientRect().width;
      }
    }
  }

  private _updateRenderedItems() {
    let { items, overflowItems } = this.props;
    let commandSurface = this.refs['commandSurface'] as HTMLElement;
    let farCommandSurface = this.refs['farCommandSurface'] as HTMLElement;
    let commandBarRegion = this.refs['commandBarRegion'] as HTMLElement;
    let searchSurface = this.refs['searchSurface'] as HTMLElement;
    let renderedItems = [].concat(items);
    let renderedOverflowItems = overflowItems;
    let consumedWidth = 0;
    let isOverflowVisible = overflowItems && overflowItems.length;

    let style = window.getComputedStyle(commandSurface);
    let availableWidth = commandBarRegion.clientWidth - parseInt(style.marginLeft) - parseInt(style.marginRight);
    if (searchSurface) {
      availableWidth -= searchSurface.getBoundingClientRect().width;
    }
    if (farCommandSurface) {
      availableWidth -= farCommandSurface.getBoundingClientRect().width;
    }

    if (isOverflowVisible) {
      availableWidth -= this._overflowWidth;
    }

    for (let i = 0; i < renderedItems.length; i++) {
      let item = renderedItems[i];
      let itemWidth = this._commandItemWidths[item.key];

      if ((consumedWidth + itemWidth) >= availableWidth) {
        if (i > 0 && !isOverflowVisible && (availableWidth - consumedWidth) < this._overflowWidth) {
          i--;
        }

        renderedOverflowItems = renderedItems.splice(i).concat(overflowItems);
        break;
      } else {
        consumedWidth += itemWidth;
      }

    }

    this.setState({
      renderedItems: renderedItems,
      renderedOverflowItems: renderedOverflowItems,
      expandedMenuItemKey: null,
      contextualMenuItems: null,
      contextualMenuTarget: null
    });
  }

  private _onItemClick(item, ev) {
    if (item.key === this.state.expandedMenuItemKey || !item.items || !item.items.length) {
      this._onContextMenuDismiss();
    } else {
      this.setState({
        expandedMenuId: ev.currentTarget.id,
        expandedMenuItemKey: item.key,
        contextualMenuItems: item.items,
        contextualMenuTarget: ev.currentTarget
      });
    }
  }

  private _onOverflowClick(ev) {
    if (this.state.expandedMenuItemKey === OVERFLOW_KEY) {
      this._onContextMenuDismiss();
    } else {

      this.setState({
        expandedMenuId: ev.currentTarget.id,
        expandedMenuItemKey: OVERFLOW_KEY,
        contextualMenuItems: this.state.renderedOverflowItems,
        contextualMenuTarget: ev.currentTarget
      });

    }
  }

  private _onContextMenuDismiss(ev?: any) {
    if (!ev || !ev.relatedTarget || !(this.refs['commandSurface'] as HTMLElement).contains(ev.relatedTarget as HTMLElement)) {
      this.setState({
        expandedMenuItemKey: null,
        contextualMenuItems: null,
        contextualMenuTarget: null
      });
    } else {
      ev.stopPropagation();
      ev.preventDefault();
    }
  }
}

export default CommandBar;