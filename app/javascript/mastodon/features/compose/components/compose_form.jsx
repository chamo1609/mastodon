import React, { createRef } from 'react';
import PropTypes from 'prop-types';

import { defineMessages } from 'react-intl';

import classNames from 'classnames';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';

import { length } from 'stringz';

import { missingAltTextModal } from 'mastodon/initial_state';

import AutosuggestInput from 'mastodon/components/autosuggest_input';
import AutosuggestTextarea from 'mastodon/components/autosuggest_textarea';
import { Button } from 'mastodon/components/button';
import { injectIntl } from '@/mastodon/components/intl';
import EmojiPickerDropdown from '../containers/emoji_picker_dropdown_container';
import PollButtonContainer from '../containers/poll_button_container';
import SpoilerButtonContainer from '../containers/spoiler_button_container';
import UploadButtonContainer from '../containers/upload_button_container';
import { countableText } from '../util/counter';

import { CharacterCounter } from './character_counter';
import { EditIndicator } from './edit_indicator';
import { LanguageDropdown } from './language_dropdown';
import { NavigationBar } from './navigation_bar';
import { PollForm } from "./poll_form";
import { ReplyIndicator } from './reply_indicator';
import { UploadForm } from './upload_form';
import { Warning } from './warning';
import { ComposeQuotedStatus } from './quoted_post';
import { VisibilityButton } from './visibility_button';

import { AddAccountModal } from './add_account_modal';

const allowedAroundShortCode = '><\u0085\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029\u0009\u000a\u000b\u000c\u000d';

const messages = defineMessages({
  placeholder: { id: 'compose_form.placeholder', defaultMessage: 'What is on your mind?' },
  spoiler_placeholder: { id: 'compose_form.spoiler_placeholder', defaultMessage: 'Content warning (optional)' },
  publish: { id: 'compose_form.publish', defaultMessage: 'Post' },
  saveChanges: { id: 'compose_form.save_changes', defaultMessage: 'Update' },
  reply: { id: 'compose_form.reply', defaultMessage: 'Reply' },
});

class ComposeForm extends ImmutablePureComponent {
  static propTypes = {
    intl: PropTypes.object.isRequired,
    text: PropTypes.string.isRequired,
    suggestions: ImmutablePropTypes.list,
    spoiler: PropTypes.bool,
    privacy: PropTypes.string,
    spoilerText: PropTypes.string,
    focusDate: PropTypes.instanceOf(Date),
    caretPosition: PropTypes.number,
    preselectDate: PropTypes.instanceOf(Date),
    isSubmitting: PropTypes.bool,
    isChangingUpload: PropTypes.bool,
    isEditing: PropTypes.bool,
    isUploading: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onClearSuggestions: PropTypes.func.isRequired,
    onFetchSuggestions: PropTypes.func.isRequired,
    onSuggestionSelected: PropTypes.func.isRequired,
    onChangeSpoilerText: PropTypes.func.isRequired,
    onPaste: PropTypes.func.isRequired,
    onDrop: PropTypes.func.isRequired,
    onPickEmoji: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
    withoutNavigation: PropTypes.bool,
    anyMedia: PropTypes.bool,
    missingAltText: PropTypes.bool,
    isInReply: PropTypes.bool,
    singleColumn: PropTypes.bool,
    lang: PropTypes.string,
    maxChars: PropTypes.number,
    redirectOnSuccess: PropTypes.bool,
  };

  static defaultProps = {
    autoFocus: false,
  };

  state = {
    highlighted: false,
    selectedAccount: null,
    isLocalSubmitting: false,
    isAddModalOpen: false, // 모달 상태 부활
  };

  constructor(props) {
    super(props);
    this.textareaRef = createRef(null);
  }

  handleSelectAccount = (account) => {
    this.setState({ selectedAccount: account });
  };

  handleAddAccountClick = () => {
    this.setState({ isAddModalOpen: true });
  };

  handleCloseAddModal = () => {
    this.setState({ isAddModalOpen: false });
  };

  handleAddAccountSuccess = (newAccount) => {
    this.setState({
      isAddModalOpen: false,
      selectedAccount: newAccount,
    });
  };

  handleChange = (e) => {
    this.props.onChange(e.target.value);
  };

  blurOnEscape = (e) => {
    if (['esc', 'escape'].includes(e.key.toLowerCase())) {
      e.target.blur();
    }
  }

  handleKeyDownPost = (e) => {
    if (e.key.toLowerCase() === 'enter' && (e.ctrlKey || e.metaKey)) {
        this.handleSubmit(e);
    }
    this.blurOnEscape(e);
  };

  handleKeyDownSpoiler = (e) => {
    if (e.key.toLowerCase() === 'enter') {
      if (e.ctrlKey || e.metaKey) {
        this.handleSubmit(e);
      } else {
        e.preventDefault();
        this.textareaRef.current?.focus();
      }
    }
    this.blurOnEscape(e);
  };

  getFulltextForCharacterCounting = () => {
    return [this.props.spoiler? this.props.spoilerText: '', countableText(this.props.text)].join('');
  };

  canSubmit = () => {
    const { isSubmitting, isChangingUpload, isUploading, maxChars } = this.props;
    const { isLocalSubmitting } = this.state;
    const fulltext = this.getFulltextForCharacterCounting();

    return !(isSubmitting || isLocalSubmitting || isUploading || isChangingUpload || length(fulltext) > maxChars);
  };

  handleSubmit = async (e) => {
    if (this.props.text !== this.textareaRef.current.value) {
      this.props.onChange(this.textareaRef.current.value);
    }

    if (!this.canSubmit()) {
      return;
    }

    if (e) {
      e.preventDefault();
    }

    const { selectedAccount } = this.state;

    if (!selectedAccount) {
      this.props.onSubmit({
        missingAltText: missingAltTextModal && this.props.missingAltText && this.props.privacy !== 'direct',
        quoteToPrivate: this.props.quoteToPrivate,
      });
      return;
    }

    this.setState({ isLocalSubmitting: true });

    try {
      const payload = {
        status: this.props.text,
        visibility: this.props.privacy,
        language: this.props.lang,
        spoiler_text: this.props.spoiler ? this.props.spoilerText : '',
      };

      const response = await fetch('/api/v1/statuses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${selectedAccount.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('부계정에서 툿을 발행하는 중 서버 에러가 발생했습니다.');
      }

      this.props.onChange('');
      if (this.props.spoiler) {
        this.props.onChangeSpoilerText('');
      }
    } catch (error) {
      console.error('부계정 툿 발행 실패:', error);
      alert('해당 부계정으로 툿을 발행하지 못했습니다. 연결을 다시 확인해 주십시오.');
    } finally {
      this.setState({ isLocalSubmitting: false });
    }
  };

  onSuggestionsClearRequested = () => {
    this.props.onClearSuggestions();
  };

  onSuggestionsFetchRequested = (token) => {
    this.props.onFetchSuggestions(token);
  };

  onSuggestionSelected = (tokenStart, token, value) => {
    this.props.onSuggestionSelected(tokenStart, token, value, ['text']);
  };

  onSpoilerSuggestionSelected = (tokenStart, token, value) => {
    this.props.onSuggestionSelected(tokenStart, token, value, ['spoiler_text']);
  };

  handleChangeSpoilerText = (e) => {
    this.props.onChangeSpoilerText(e.target.value);
  };

  handleFocus = () => {
    if (this.composeForm && !this.props.singleColumn) {
      const { left, right } = this.composeForm.getBoundingClientRect();
      if (left < 0 || right > (window.innerWidth || document.documentElement.clientWidth)) {
        this.composeForm.scrollIntoView();
      }
    }
  };

  componentDidMount () {
    this._updateFocusAndSelection({ });
  }

  componentWillUnmount () {
    if (this.timeout) clearTimeout(this.timeout);
  }

  componentDidUpdate (prevProps) {
    this._updateFocusAndSelection(prevProps);
  }

  _updateFocusAndSelection = (prevProps) => {
    if (this.props.focusDate && this.props.focusDate !== prevProps.focusDate) {
      let selectionEnd, selectionStart;

      if (this.props.preselectDate !== prevProps.preselectDate && this.props.isInReply) {
        selectionEnd   = this.props.text.length;
        selectionStart = this.props.text.search(/\s/) + 1;
      } else if (typeof this.props.caretPosition === 'number') {
        selectionStart = this.props.caretPosition;
        selectionEnd   = this.props.caretPosition;
      } else {
        selectionEnd   = this.props.text.length;
        selectionStart = selectionEnd;
      }

      Promise.resolve().then(() => {
        this.textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
        this.textareaRef.current.focus();
        this.setState({ highlighted: true });
        this.timeout = setTimeout(() => this.setState({ highlighted: false }), 700);
      }).catch(console.error);
    } else if(prevProps.isSubmitting && !this.props.isSubmitting) {
      this.textareaRef.current.focus();
    } else if (this.props.spoiler !== prevProps.spoiler) {
      if (this.props.spoiler) {
        this.spoilerText.input.focus();
      } else if (prevProps.spoiler) {
        this.textareaRef.current.focus();
      }
    }
  };

  setSpoilerText = (c) => {
    this.spoilerText = c;
  };

  setRef = c => {
    this.composeForm = c;
  };

  handleEmojiPick = (data) => {
    const { text }     = this.props;
    const position     = this.textareaRef.current.selectionStart;
    const needsSpace   = data.custom && position > 0 && !allowedAroundShortCode.includes(text[position - 1]);

    this.props.onPickEmoji(position, data, needsSpace);
  };

  render () {
    const { intl, onPaste, onDrop, autoFocus, withoutNavigation, maxChars, isSubmitting } = this.props;
    const { highlighted, selectedAccount, isLocalSubmitting } = this.state;

    return (
      <React.Fragment>
        {/* 모달 렌더링 부활 */}
        {this.state.isAddModalOpen && (
          <AddAccountModal 
            onClose={this.handleCloseAddModal} 
            onSuccess={this.handleAddAccountSuccess} 
          />
        )}
        <form className='compose-form' onSubmit={this.handleSubmit}>
          <ReplyIndicator />
          
          {!withoutNavigation && (
            <NavigationBar 
              selectedAccount={selectedAccount}
              onSelectAccount={this.handleSelectAccount}
              onAddAccountClick={this.handleAddAccountClick}
            />
          )}
          <Warning />

          <div className={classNames('compose-form__highlightable', { active: highlighted })} ref={this.setRef}>
            <EditIndicator />

            <div className='compose-form__dropdowns'>
              <VisibilityButton disabled={this.props.isEditing} />
              <LanguageDropdown />
            </div>

            {this.props.spoiler && (
              <div className='spoiler-input'>
                <div className='spoiler-input__border' />

                <AutosuggestInput
                  placeholder={intl.formatMessage(messages.spoiler_placeholder)}
                  value={this.props.spoilerText}
                  disabled={isSubmitting || isLocalSubmitting}
                  onChange={this.handleChangeSpoilerText}
                  onKeyDown={this.handleKeyDownSpoiler}
                  ref={this.setSpoilerText}
                  suggestions={this.props.suggestions}
                  onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
                  onSuggestionsClearRequested={this.onSuggestionsClearRequested}
                  onSuggestionSelected={this.onSpoilerSuggestionSelected}
                  searchTokens={[':']}
                  id='cw-spoiler-input'
                  className='spoiler-input__input'
                  lang={this.props.lang}
                  spellCheck
                />

                <div className='spoiler-input__border' />
              </div>
            )}

            <AutosuggestTextarea
              ref={this.textareaRef}
              placeholder={intl.formatMessage(messages.placeholder)}
              disabled={isSubmitting || isLocalSubmitting}
              value={this.props.text}
              onChange={this.handleChange}
              suggestions={this.props.suggestions}
              onFocus={this.handleFocus}
              onKeyDown={this.handleKeyDownPost}
              onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
              onSuggestionsClearRequested={this.onSuggestionsClearRequested}
              onSuggestionSelected={this.onSuggestionSelected}
              onPaste={onPaste}
              onDrop={onDrop}
              autoFocus={autoFocus}
              lang={this.props.lang}
              className='compose-form__input'
            />

            <UploadForm />
            <PollForm />
            <ComposeQuotedStatus />

            <div className='compose-form__footer'>
              <div className='compose-form__actions'>
                <div className='compose-form__buttons'>
                  <UploadButtonContainer />
                  <PollButtonContainer />
                  <SpoilerButtonContainer />
                  <EmojiPickerDropdown onPickEmoji={this.handleEmojiPick} />
                  <CharacterCounter max={maxChars} text={this.getFulltextForCharacterCounting()} />
                </div>

                <div className='compose-form__submit'>
                  <Button
                    type='submit'
                    compact
                    disabled={!this.canSubmit()}
                    loading={isSubmitting || isLocalSubmitting}
                  >
                    {intl.formatMessage(
                      this.props.isEditing ?
                        messages.saveChanges :
                        (this.props.isInReply ? messages.reply : messages.publish)
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </React.Fragment>
    );
  }

}

export default injectIntl(ComposeForm);