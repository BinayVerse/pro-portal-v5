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
            Transform your artefacts into interactive conversations. Upload, organize, and chat with
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
            Powerful features designed to revolutionize how you interact with your artefacts
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="card text-center group hover:scale-105 transition-transform duration-200">
            <div
              class="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/30 transition-colors"
            >
              <UIcon name="heroicons:chat-bubble-left-ellipsis" class="w-8 h-8 text-primary-400" />
            </div>
            <h3 class="text-xl font-semibold text-white mb-4">Intelligent Chat</h3>
            <p class="text-gray-300">
              Ask questions about your artefacts and get instant, accurate answers powered by
              advanced AI.
            </p>
          </div>

          <div class="card text-center group hover:scale-105 transition-transform duration-200">
            <div
              class="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/30 transition-colors"
            >
              <UIcon name="heroicons:document-text" class="w-8 h-8 text-primary-400" />
            </div>
            <h3 class="text-xl font-semibold text-white mb-4">Multi-Format Support</h3>
            <p class="text-gray-300">
              Support for PDF, DOC, CSV, Markdown, TXT, Image, and Database. Upload from local storage or Google
              Drive.
            </p>
          </div>

          <div class="card text-center group hover:scale-105 transition-transform duration-200">
            <div
              class="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/30 transition-colors"
            >
              <UIcon name="heroicons:link" class="w-8 h-8 text-primary-400" />
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
          Ready to Transform Your Artefact Workflow?
        </h2>
        <p class="text-xl text-gray-300 mb-8">
          Join thousands of businesses already using Provento.ai to unlock the power of their
          artefacts.
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
