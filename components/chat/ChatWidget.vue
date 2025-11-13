<template>
  <teleport to="body">
    <div ref="container" class="fixed right-6 bottom-6 pointer-events-auto" style="z-index: 999999">
      <div v-if="!open" class="flex flex-col items-end space-y-3 relative">
        <!-- bubble above the button, appears with animation -->
        <transition name="bubble" appear>
          <div
            v-if="showHint"
            class="hidden sm:block bg-dark-800 text-gray-100 px-4 py-2 rounded-full border border-primary-600 shadow-lg max-w-xs relative"
            key="hint"
          >
            <button
              @click.stop="hideHint"
              aria-label="Dismiss hint"
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-dark-900 border border-dark-700 flex items-center justify-center text-gray-300 hover:bg-dark-800"
            >
              <UIcon name="heroicons:x-mark" class="w-3 h-3" />
            </button>
            <div class="flex items-center space-x-3">
              <div class="flex -space-x-2">
                <div class="w-7 h-7 rounded-full bg-primary-400 ring-2 ring-dark-900"></div>
              </div>
              <div class="text-sm">
                {{
                  hasArtefacts
                    ? 'Start chatting with your artefacts'
                    : 'Upload your artefacts to get started with smart conversations.'
                }}
              </div>
            </div>
          </div>
        </transition>

        <button
          @click.stop="open = true"
          aria-label="Open chat"
          :disabled="!hasArtefacts"
          :title="!hasArtefacts ? 'Upload artefacts to enable chat' : 'Open chat'"
          :class="[
            'w-14 h-14 rounded-full shadow-lg flex items-center justify-center',
            !hasArtefacts
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white',
          ]"
        >
          <UIcon name="heroicons:chat-bubble-left-ellipsis" class="w-6 h-6" />
        </button>
      </div>

      <div
        v-else
        class="w-96 h-[520px] bg-dark-900 border border-dark-700 rounded-xl shadow-xl flex flex-col"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-dark-700">
          <div class="flex items-center space-x-3">
            <UIcon name="heroicons:chat-bubble-left-ellipsis" class="w-5 h-5 text-white" />
            <div class="text-white font-medium">provento.ai</div>
          </div>

          <div class="flex items-center space-x-2">
            <button
              @click="onToggleHistory"
              :aria-pressed="showHistory"
              class="flex items-center gap-2 px-3 py-1 rounded-md bg-dark-800 hover:bg-dark-700 text-sm text-gray-200 border border-transparent focus:outline-none"
              :title="historyLabel"
            >
              <UIcon :name="historyIcon" class="w-4 h-4 text-primary-400" />
              <span class="hidden sm:inline">{{ historyLabel }}</span>
            </button>

            <button
              v-if="!showHistory"
              @click="clearConversation"
              class="flex items-center justify-center w-9 h-9 rounded-md text-gray-300 hover:bg-dark-800 border border-dark-700"
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <UIcon name="heroicons:trash" class="w-4 h-4" />
            </button>

            <button
              @click="close"
              aria-label="Close chat"
              class="w-8 h-8 rounded-md text-gray-300 hover:text-white flex items-center justify-center"
            >
              <UIcon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="flex-1 bg-black flex flex-col min-h-0">
          <div v-if="showHistory" class="flex-1 p-4 flex flex-col min-h-0">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm text-gray-300 font-semibold">Recent Conversations</div>
              <div class="text-xs text-gray-400">{{ (conversations || []).length }} items</div>
            </div>

            <div v-if="historyLoading" class="text-gray-400">Loading...</div>

            <div v-else class="flex-1 overflow-auto min-h-0">
              <div v-if="conversations.length === 0" class="text-gray-500">
                No conversations found
              </div>

              <div class="space-y-3 pr-2">
                <div
                  v-for="(c, i) in conversations"
                  :key="c.chat_id || i"
                  @click="openConversation(c.chat_id)"
                  role="button"
                  tabindex="0"
                  @keyup.enter="openConversation(c.chat_id)"
                  class="relative bg-dark-800 rounded-md p-3 hover:bg-dark-700 transition-colors cursor-pointer"
                >
                  <div class="flex items-start space-x-3">
                    <div
                      class="flex-shrink-0 w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white font-bold"
                    >
                      <UIcon name="heroicons:document-text" class="w-4 h-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-gray-200 font-medium truncate" :title="c.header">
                        {{ c.header }}
                      </div>
                      <div
                        class="mt-2 text-sm text-gray-400"
                        :title="c.body"
                        style="
                          display: -webkit-box;
                          -webkit-line-clamp: 3;
                          line-clamp: 3;
                          -webkit-box-orient: vertical;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        "
                      >
                        {{ c.body }}
                      </div>
                      <div class="mt-2 text-xs text-gray-400 text-right">
                        {{ c.last_at_formatted || c.last_at }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else ref="scrollArea" class="flex-1 overflow-auto p-4 space-y-4 bg-black min-h-0">
            <div v-if="messages.length === 0 && !loading" class="w-full text-center text-gray-400">
              Feel free to ask anything about the artefacts you’ve uploaded.
            </div>
            <div v-for="(m, idx) in messages" :key="idx" class="max-w-full">
              <div v-if="m.from === 'user'" class="text-right">
                <div class="inline-block bg-primary-600 text-white px-3 py-2 rounded-lg">
                  {{ m.content }}
                </div>
              </div>

              <div v-else class="text-left">
                <div class="inline-block bg-dark-800 text-gray-200 px-3 py-2 rounded-lg max-w-full">
                  <!-- Agent / Category List -->
                  <div v-if="m.meta && m.meta.type === 'agent_list'">
                    <div class="font-medium mb-2">Which AI Agent would you like to start with?</div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="cat in m.meta.categories"
                        :key="cat.id"
                        @click="onSelectCategory(cat, m)"
                        :disabled="m.meta.disabled"
                        :class="[
                          'px-3 py-1 text-sm rounded-md border flex items-center',
                          m.meta.disabled
                            ? 'bg-dark-900 text-gray-500 border-dark-700 cursor-not-allowed'
                            : 'bg-dark-700 hover:bg-dark-600 border-dark-600',
                          cat && (cat.selected === true || cat.selected === 'true')
                            ? 'ring-2 ring-primary-500 bg-primary-700 text-white'
                            : '',
                        ]"
                      >
                        <span class="block w-full truncate max-w-[180px] sm:max-w-[260px]">{{
                          decodeHtml(cat.name)
                        }}</span>
                      </button>
                      <button
                        v-if="m.meta.hasMore"
                        @click="onShowMoreAgents(m)"
                        :disabled="m.meta.moreDisabled"
                        :class="[
                          'px-3 py-1 text-sm rounded-md border',
                          m.meta.moreDisabled
                            ? 'bg-dark-900 text-gray-500 cursor-not-allowed'
                            : 'bg-dark-700 hover:bg-dark-600 border-dark-600',
                        ]"
                      >
                        More
                      </button>
                    </div>
                  </div>

                  <!-- Document List -->
                  <div v-else-if="m.meta && m.meta.type === 'document_list'">
                    <div class="font-medium mb-2">
                      {{ getDocumentListPrompt(m) }}
                    </div>
                    <!-- Commented document listing as per category -->
                    <!-- <div class="flex flex-col gap-2">
                      <div v-if="m.meta.noDocuments" class="text-sm text-gray-400">
                        No knowledge base found for this AI agent.
                      </div>

                      <button
                        v-for="doc in m.meta.documents"
                        :key="doc.id"
                        @click="onSelectDocument(doc)"
                        :disabled="m.meta.disabled"
                        :class="[
                          'text-left px-3 py-2 rounded-md border flex flex-col items-start',
                          m.meta.disabled
                            ? 'bg-dark-900 text-gray-500 border-dark-700 cursor-not-allowed'
                            : 'bg-dark-700 hover:bg-dark-600 border-dark-600',
                          doc && (doc.selected === true || doc.selected === 'true')
                            ? 'ring-2 ring-primary-500 bg-primary-700 text-white'
                            : '',
                        ]"
                      >
                        <div
                          class="font-medium text-sm w-full truncate max-w-[240px] sm:max-w-[360px]"
                        >
                          {{ decodeHtml(doc.name) }}
                        </div>
                      </button>

                      <button
                        v-if="m.meta.hasMore"
                        @click="onShowMoreDocuments(m)"
                        :disabled="m.meta.moreDisabled"
                        :class="[
                          'px-3 py-1 text-sm rounded-md border',
                          m.meta.moreDisabled
                            ? 'bg-dark-900 text-gray-500 cursor-not-allowed'
                            : 'bg-dark-700 hover:bg-dark-600 border-dark-600',
                        ]"
                      >
                        More
                      </button>

                      <div
                        v-if="
                          m.meta.actions && m.meta.actions.length && idx === messages.length - 1
                        "
                        class="flex gap-2 mt-2"
                      >
                        <button
                          v-for="a in m.meta.actions"
                          :key="a.id"
                          @click.prevent="onActionClick(a.id)"
                          class="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-sm rounded-md border border-dark-600"
                        >
                          {{ a.label }}
                        </button>
                      </div>
                    </div> -->
                  </div>

                  <!-- Document summary or default bot message -->
                  <div v-else>
                    <div v-html="m.contentHtml || formatResponseToHtml(m.content)"></div>

                    <!-- Actions for summaries (only on last message) -->
                    <div
                      v-if="
                        m.meta &&
                        m.meta.type === 'document_summary' &&
                        m.meta.actions &&
                        m.meta.actions.length &&
                        idx === messages.length - 1
                      "
                      class="flex gap-2 mt-2"
                    >
                      <button
                        v-for="a in m.meta.actions"
                        :key="a.id"
                        @click.prevent="onActionClick(a.id)"
                        class="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-sm rounded-md border border-dark-600"
                      >
                        {{ a.label }}
                      </button>
                    </div>

                    <div v-if="m.links && m.links.length" class="mt-2 text-sm">
                      <div v-for="(l, i) in m.links" :key="i">
                        <a :href="l.url" target="_blank" class="text-primary-400 underline">{{
                          l.text || l.url
                        }}</a>
                      </div>
                    </div>
                    <div
                      v-if="m.citations && m.citations.length"
                      class="mt-2 text-xs text-gray-400"
                    >
                      <div class="font-semibold text-gray-300">Document Source:</div>
                      <div v-for="(c, i) in m.citations" :key="i">{{ c }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="loading" class="text-left text-sm text-gray-400">
              provento.ai is thinking...
            </div>
          </div>
        </div>

        <form
          v-if="!showHistory"
          @submit.prevent="sendMessageLocal"
          class="px-3 py-3 border-t border-dark-700 bg-dark-900"
        >
          <div class="flex items-center space-x-2">
            <input
              v-model="input"
              @input="onUserTyping"
              placeholder="Ask me anything..."
              class="flex-1 bg-dark-800 text-gray-200 px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              :disabled="!canSend || loading"
              type="submit"
              :class="[
                'btn-primary px-3 py-2',
                !canSend || loading ? 'opacity-50 cursor-not-allowed' : '',
              ]"
            >
              {{ loading ? 'Processing...' : 'Send' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import dayjs from 'dayjs'
import { useAuthStore } from '~/stores/auth/index'
import { useNotification } from '~/composables/useNotification'
import { useChatStore } from '~/stores/chat/index'
import { useArtefactsStore } from '~/stores/artefacts'
import { useProfileStore } from '~/stores/profile/index'
import { formatResponseToHtml } from '~/utils/formatResponse'

const auth = useAuthStore()
const notify = useNotification()
const chat = useChatStore()
const artefactsStore = useArtefactsStore()
const hasArtefacts = computed(
  () => Array.isArray(artefactsStore.artefacts) && artefactsStore.artefacts.length > 0,
)

const open = ref(false)
const input = ref('')
const scrollArea = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)

// Use CSS overscroll-behavior to contain scroll within chat/history areas and avoid page scroll
const showHint = ref(true)
onMounted(async () => {
  // nothing to attach; scrolling is handled natively and contained via CSS on elements
  nextTick(() => {})
  // Ensure profile and artefacts are loaded so hasArtefacts is accurate across pages
  try {
    const profileStore = useProfileStore()
    // If profile not loaded yet, fetch it
    if (!profileStore.userProfile || !profileStore.userProfile.user_id) {
      await profileStore.fetchUserProfile()
    }
  } catch (e) {
    // ignore profile fetch errors
  }

  try {
    // fetch artefacts to ensure artefactsStore is populated on non-artefacts pages
    await artefactsStore.fetchArtefacts()
  } catch (e) {
    // ignore artefacts fetch errors
  }

  // hint state is managed in-memory only (resets on full page reload)
})

const showHistory = ref(false)
const conversations = computed(() => (chat.conversations as any) || [])
const historyLoading = computed(() => (chat.historyLoading as any) || false)

const historyLabel = computed(() => (showHistory.value ? 'Live chat' : 'History'))
const historyIcon = computed(() =>
  showHistory.value ? 'heroicons:chat-bubble-left-ellipsis' : 'heroicons:clock',
)

function hideHint() {
  showHint.value = false
}

function getDocumentListPrompt(message: any) {
  try {
    if (!message || !message.meta)
      return 'The provento assistant is now active. Please submit your inquiry.'
    const meta = message.meta
    // priority: explicit categoryName from meta
    if (meta.categoryName)
      return `The ${meta.categoryName} assistant is now active. Please submit your inquiry..`
    // next: selectedCategoryId on meta
    if (meta.selectedCategoryId) {
      const matched = (meta.categories || []).find(
        (c: any) =>
          String(c.id) === String(meta.selectedCategoryId) ||
          c.selected === true ||
          c.selected === 'true',
      )
      if (matched && matched.name)
        return `The ${decodeHtml(matched.name)} assistant is now active. Please submit your inquiry.`
    }
    // next: look for a single selected category in categories
    if (Array.isArray(meta.categories)) {
      const sel = meta.categories.find(
        (c: any) =>
          c &&
          (c.selected === true || c.selected === 'true' || String(c.selected) === String(c.id)),
      )
      if (sel && sel.name)
        return `The ${decodeHtml(sel.name)} assistant is now active. Please submit your inquiry.`
    }
    return 'The provento assistant is now active. Please submit your inquiry.'
  } catch (e) {
    return 'The provento assistant is now active. Please submit your inquiry.'
  }
}

const messages = computed(() => (chat.messages as any) || [])
const loading = computed(() => (chat.loading as any) || false)
const canSend = computed(() => !!input.value.trim())

function onUserTyping() {
  try {
    const text = input.value?.trim() || ''
    // Find latest active (non-disabled) agent_list message; if none, pick the latest agent_list
    let lastAgentMsg = [...(messages.value || [])]
      .reverse()
      .find((m: any) => m && m.meta && m.meta.type === 'agent_list' && !m.meta.disabled)
    if (!lastAgentMsg)
      lastAgentMsg = [...(messages.value || [])]
        .reverse()
        .find((m: any) => m && m.meta && m.meta.type === 'agent_list')

    if (lastAgentMsg && Array.isArray(lastAgentMsg.meta.categories)) {
      // normalize comparator
      const normalize = (s: any) =>
        String(s || '')
          .toLowerCase()
          .replace(/&amp;|&/g, '&')
          .replace(/[^a-z0-9\s&]/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
      const tnorm = normalize(text)
      let matchedId: string | null = null
      if (tnorm) {
        for (const c of lastAgentMsg.meta.categories) {
          if (!c) continue
          const nameNorm = normalize(c.name)
          const idNorm = normalize(c.id)
          if (
            nameNorm === tnorm ||
            idNorm === tnorm ||
            nameNorm.startsWith(tnorm) ||
            nameNorm.includes(tnorm)
          ) {
            matchedId = c.id
            break
          }
        }
      }

      // Update meta.selected flags and store selectedCategoryId accordingly
      lastAgentMsg.meta.categories = lastAgentMsg.meta.categories.map((c: any) => ({
        ...c,
        selected: matchedId ? String(c.id) === String(matchedId) : false,
      }))
      if (matchedId) chat.selectedCategoryId = String(matchedId)
      else chat.selectedCategoryId = null
    } else {
      // No agent list present - fall back to disabling interactive messages to prepare for free text
      try {
        chat.disableInteractiveMessages()
      } catch (e) {}
    }
  } catch (e) {
    // ignore
  }
}

onBeforeUnmount(() => {
  // no local timers
})

async function onToggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) {
    try {
      await chat.fetchConversations()
    } catch (err: any) {
      notify.showError(err?.message || 'Failed to load conversations')
    }
  }
}

async function openConversation(chatId: string) {
  if (!chatId) return
  try {
    await chat.loadConversation(chatId)
    showHistory.value = false
    open.value = true
    scrollToBottom()
  } catch (err: any) {
    notify.showError(err?.message || 'Failed to load conversation')
  }
}

async function sendMessageLocal() {
  const text = input.value.trim()
  if (!text) return

  input.value = ''
  scrollToBottom()

  const payload = {
    question: text,
    wa_id: auth.user?.user_id || undefined,
    org_id: auth.user?.org_id || undefined,
    request_source: 'admin',
    history: (chat.messages || []).map((m: any) => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
  }

  try {
    // ensure interactive messages are disabled when sending a new message
    try {
      chat.disableInteractiveMessages()
    } catch (e) {}
    // immediately mark loading to disable the send button while awaiting server response
    try {
      chat.setLoading(true)
    } catch (e) {}
    // Send message immediately so user sees their message without waiting for history persistence
    const sendPromise = chat.sendMessage(payload)
    // Wait for send to complete (server will persist interaction) and avoid duplicating persistence calls
    await sendPromise
    try {
      chat.setLoading(false)
    } catch (e) {}
    scrollToBottom()
  } catch (err: any) {
    notify.showError(err?.message || 'Failed to send message')
    if (err?.status === 401 || /unauthoriz/i.test(err?.message || '')) {
      await auth.clearAuth()
      navigateTo('/login')
    }
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollArea.value) {
      scrollArea.value.scrollTop = scrollArea.value.scrollHeight
    }
  })
}

function close() {
  open.value = false
  showHistory.value = false
}

async function clearConversation() {
  try {
    // delegate to store to reset conversation state and create a new chat id
    if (chat && chat.startOver) {
      await chat.startOver(false)
    } else {
      if (chat && chat.messages) chat.messages.length = 0
      if (chat && chat.setLoading) chat.setLoading(false)
    }
    // clear input and ensure UI resets
    input.value = ''
    nextTick(() => scrollToBottom())
  } catch (e) {
    // fallback: clear client-side messages
    if (chat && chat.messages) chat.messages.length = 0
    input.value = ''
  }
}

function onOutsideClick(e: MouseEvent) {
  if (!container.value) return
  const el = container.value as HTMLElement
  const target = e.target as Node
  if (!el.contains(target)) {
    open.value = false
    showHistory.value = false
  }
}

// Handlers for interactive agent/document buttons
async function onSelectCategory(cat: any, originMsg: any) {
  try {
    // disable interactive UI immediately
    try {
      chat.disableInteractiveMessages()
    } catch (e) {}
    // reflect the user's choice in chat
    chat.messages.push({ from: 'user', content: cat.name })
    // call store to load documents for category (this will mark selection on the specific agent_list)
    await chat.selectCategory(cat.id, originMsg)
    // persist once after the selection (ensure history reflects user's action)
    try {
      await chat.persistInteraction()
    } catch (e) {}
    scrollToBottom()
  } catch (err: any) {
    notify.showError('Failed to load category documents')
  }
}

async function onShowMoreAgents(msg: any) {
  try {
    if (!msg || !msg.meta) return
    // prevent double clicks
    msg.meta.moreDisabled = true
    const orgId = auth.user?.org_id || undefined
    if (!orgId) return
    // ensure categories are loaded
    await artefactsStore.fetchCategories(orgId)
    const allCats = artefactsStore.categories || []
    const already = (msg.meta.categories || []).length || 0
    const next = (allCats || [])
      .slice(already, already + 5)
      .map((c: any) => ({ id: c.id, name: c.name }))
    msg.meta.categories = (msg.meta.categories || []).concat(next)
    msg.meta.hasMore = (allCats || []).length > (msg.meta.categories || []).length
    msg.meta.moreDisabled = false
    scrollToBottom()
  } catch (err: any) {
    notify.showError('Failed to load more agents')
  }
}

async function onSelectDocument(doc: any) {
  try {
    try {
      chat.disableInteractiveMessages()
    } catch (e) {}
    chat.messages.push({ from: 'user', content: doc.name })
    await chat.selectDocument(doc.id)
    try {
      await chat.persistInteraction()
    } catch (e) {}
    scrollToBottom()
  } catch (err: any) {
    notify.showError('Failed to load document summary')
  }
}

async function onShowMoreDocuments(msg: any) {
  try {
    if (!msg || !msg.meta) return
    msg.meta.moreDisabled = true
    await artefactsStore.fetchArtefacts()
    const categoryId = msg.meta.categoryId
    const categoryName = artefactsStore.categories.find((c: any) => c.id === categoryId)?.name
    const docs = (artefactsStore.artefacts || []).filter((d: any) => {
      const catVal = (
        d.category ||
        d.fileCategory ||
        d.file_category ||
        d.category_name ||
        ''
      ).toString()
      return catVal === categoryName?.toString()
    })
    const already = (msg.meta.documents || []).length || 0
    const next = (docs || [])
      .slice(already, already + 5)
      .map((d: any) => ({ id: d.id, name: d.name, summarized: d.summarized }))
    msg.meta.documents = (msg.meta.documents || []).concat(next)
    msg.meta.hasMore = (docs || []).length > (msg.meta.documents || []).length
    msg.meta.moreDisabled = false
    scrollToBottom()
  } catch (err: any) {
    notify.showError('Failed to load more documents')
  }
}

function onActionClick(actionId: string) {
  if (actionId === 'back') {
    void chat.goBack()
    scrollToBottom()
    return
  }

  if (actionId === 'start_over') {
    void chat.startOver()
    scrollToBottom()
    return
  }
}

function decodeHtml(str: string) {
  if (!str) return ''
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

watch(open, (val) => {
  if (val) {
    window.addEventListener('mousedown', onOutsideClick)
  } else {
    window.removeEventListener('mousedown', onOutsideClick)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onOutsideClick)
})
</script>

<style scoped>
.btn-primary {
  background-color: #2563eb;
  color: white;
  border-radius: 0.375rem;
}

/* bubble slide-up-fade transition */
.bubble-enter-from,
.bubble-appear-from {
  transform: translateY(8px);
  opacity: 0;
}
.bubble-enter-to,
.bubble-appear-to {
  transform: translateY(0);
  opacity: 1;
}
.bubble-enter-active,
.bubble-appear-active {
  transition: all 260ms cubic-bezier(0.2, 0.9, 0.2, 1);
}
.bubble-leave-from {
  transform: translateY(0);
  opacity: 1;
}
.bubble-leave-to {
  transform: translateY(8px);
  opacity: 0;
}
.bubble-leave-active {
  transition: all 200ms ease;
}
</style>
