# frozen_string_literal: true

class Api::V1::ConversationsController < Api::BaseController
  LIMIT = 20

  before_action -> { doorkeeper_authorize! :read, :'read:statuses' }, only: [:index, :statuses]
  before_action -> { doorkeeper_authorize! :write, :'write:conversations' }, except: [:index, :statuses]
  
  before_action :require_user!
  before_action :set_conversation, except: :index
  after_action :insert_pagination_headers, only: :index
  after_action :insert_statuses_pagination_headers, only: :statuses

  def index
    @conversations = paginated_conversations
    render json: @conversations, each_serializer: REST::ConversationSerializer, relationships: StatusRelationshipsPresenter.new(@conversations.map(&:last_status), current_user&.account_id)
  end

  def statuses
    if @conversation.nil?
      @statuses = []
      render json: @statuses
      return
    end

    target_participants = @conversation.participant_account_ids
    matching_conversation_ids = AccountConversation.where(account: current_account, participant_account_ids: target_participants).pluck(:conversation_id)

    @statuses = Status.where(conversation_id: @conversation.conversation_id)
                      .includes(:account, :media_attachments, :mentions, :tags)
                      .to_a_paginated_by_id(limit_param(LIMIT), params_slice(:max_id, :since_id, :min_id))

    render json: @statuses, each_serializer: REST::StatusSerializer, relationships: StatusRelationshipsPresenter.new(@statuses, current_user&.account_id)
  end

  def read
    @conversation.update!(unread: false)
    render json: @conversation, serializer: REST::ConversationSerializer
  end

  def unread
    @conversation.update!(unread: true)
    render json: @conversation, serializer: REST::ConversationSerializer
  end

  def destroy
    @conversation.destroy!
    render_empty
  end

  private

  def set_conversation
    @conversation = AccountConversation.where(account: current_account).find_by(id: params[:id])
    raise ActiveRecord::RecordNotFound if @conversation.nil? && action_name != 'statuses'
  end

  def paginated_conversations
    AccountConversation.where(account: current_account)
      .includes(
        account: [:account_stat, user: :role],
        last_status: [
          :media_attachments,
          :status_stat,
          :tags,
          {
            preview_cards_status: { preview_card: { author_account: [:account_stat, user: :role] } },
            active_mentions: :account,
            account: [:account_stat, user: :role],
          },
        ]
      )
      .to_a_paginated_by_id(limit_param(LIMIT), params_slice(:max_id, :since_id, :min_id))
  end

  def next_path
    api_v1_conversations_url pagination_params(max_id: pagination_max_id) if records_continue?
  end

  def prev_path
    api_v1_conversations_url pagination_params(min_id: pagination_since_id) unless @conversations.empty?
  end

  def pagination_max_id
    @conversations.last.last_status_id
  end

  def pagination_since_id
    @conversations.first.last_status_id
  end

  def records_continue?
    @conversations.size == limit_param(LIMIT)
  end

  def insert_statuses_pagination_headers
    set_pagination_headers(next_statuses_path, prev_statuses_path)
  end

  def next_statuses_path
    return nil if @conversation.nil? || @statuses.blank?
    "/api/v1/conversations/#{@conversation.id}/statuses?#{pagination_params(max_id: @statuses.last.id).to_query}" if @statuses.size == limit_param(LIMIT)
  end

  def prev_statuses_path
    return nil if @conversation.nil? || @statuses.blank?
    "/api/v1/conversations/#{@conversation.id}/statuses?#{pagination_params(min_id: @statuses.first.id).to_query}" unless @statuses.empty?
  end
end