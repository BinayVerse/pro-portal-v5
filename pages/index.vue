<template>
  <div>
    <!-- Hero Section -->
    <section class="pt-16 pb-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in">
            Bring Your Business To Life With The Power Of
            <span class="text-primary-400">Intelligent Conversations</span>
          </h1>
          <p class="text-xl text-gray-300 mb-8 max-w-3xl mx-auto animate-slide-up">
            Transform your documents into interactive conversations. Upload, organize, and chat with
            your files using advanced AI technology.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center animate-scale-up">
            <NuxtLink to="/features" class="btn-outline text-lg px-8 py-4"> Learn More </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Preview -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 bg-dark-950/50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Why Choose Provento.ai?</h2>
          <p class="text-xl text-gray-300 max-w-2xl mx-auto">
            Powerful features designed to revolutionize how you interact with your documents
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="card text-center group hover:scale-105 transition-transform duration-200">
            <div
              class="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/30 transition-colors"
            >
              <svg
                class="w-8 h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                ></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-4">Intelligent Chat</h3>
            <p class="text-gray-300">
              Ask questions about your documents and get instant, accurate answers powered by
              advanced AI.
            </p>
          </div>

          <div class="card text-center group hover:scale-105 transition-transform duration-200">
            <div
              class="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/30 transition-colors"
            >
              <svg
                class="w-8 h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-4">Multi-Format Support</h3>
            <p class="text-gray-300">
              Support for PDF, DOC, CSV, Markdown, and TXT. Upload from local storage or Google
              Drive.
            </p>
          </div>

          <div class="card text-center group hover:scale-105 transition-transform duration-200">
            <div
              class="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/30 transition-colors"
            >
              <svg
                class="w-8 h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                ></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-4">Workplace Connectivity</h3>
            <p class="text-gray-300">
              Integrate with Slack, Microsoft Teams, and WhatsApp for frictionless collaboration and
              support.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section
      class="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-900/20 to-primary-800/20"
    >
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-6">
          Ready to Transform Your Document Workflow?
        </h2>
        <p class="text-xl text-gray-300 mb-8">
          Join thousands of businesses already using Provento.ai to unlock the power of their
          documents.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink to="/book-meeting" class="btn-primary text-lg px-8 py-4">
            Book a Demo
          </NuxtLink>
          <NuxtLink to="/pricing" class="btn-outline text-lg px-8 py-4"> View Pricing </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Using default layout automatically
</script>
