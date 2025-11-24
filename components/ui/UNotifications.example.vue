<template>
  <!-- Example: Using UNotifications component in a layout or page -->
  <div class="min-h-screen bg-dark-900">
    <!-- Place this at the top of your layout or page -->
    <div class="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- UNotifications Component -->
        <UNotifications
          ref="notificationsRef"
          :threshold-percentage="80"
          :dismissible="true"
          :auto-hide-duration="0"
        />
      </div>
    </div>

    <!-- Page Content -->
    <div class="max-w-7xl mx-auto p-4 space-y-6">
      <div class="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h1 class="text-2xl font-bold text-white mb-4">
          UNotifications Component Example
        </h1>

        <div class="space-y-4 text-gray-300">
          <p>
            The UNotifications component displays usage warnings and upgrade prompts based on user plan limits.
          </p>

          <h2 class="text-lg font-semibold text-white mt-6">Features</h2>
          <ul class="list-disc list-inside space-y-2">
            <li>Monitors team members limit (users)</li>
            <li>Monitors query limit (limit_requests)</li>
            <li>Monitors storage limit (storage_limit_gb)</li>
            <li>Monitors artefacts upload limit</li>
            <li>Shows warning at 80% usage (configurable)</li>
            <li>Shows critical alert at 95% usage</li>
            <li>Dismissible notifications</li>
            <li>Upgrade prompt with CTA buttons</li>
          </ul>

          <h2 class="text-lg font-semibold text-white mt-6">Configuration Options</h2>
          <div class="bg-dark-700 rounded p-3 overflow-auto">
            <pre class="text-sm">UNotifications
  threshold-percentage="80"
  dismissible="true"
  auto-hide-duration="0"</pre>
          </div>

          <h2 class="text-lg font-semibold text-white mt-6">Usage in Your Pages/Layouts</h2>
          <p class="text-sm">
            Simply include the UNotifications component at the top of your page or layout:
          </p>
          <div class="bg-dark-700 rounded p-3">
            <p class="text-xs text-gray-400">Add to your template:</p>
          </div>

          <h2 class="text-lg font-semibold text-white mt-6">API Integration</h2>
          <p class="text-sm">
            The component uses these API endpoints to fetch usage data:
          </p>
          <ul class="list-disc list-inside space-y-2 text-sm">
            <li>/api/integrations/overview - Fetches overall usage stats</li>
            <li>/api/integrations/activity - Fetches activity and request count</li>
          </ul>

          <h2 class="text-lg font-semibold text-white mt-6">Notification Types</h2>
          <div class="space-y-3">
            <div class="p-3 bg-amber-900/20 border border-amber-800 rounded text-amber-200 text-sm">
              <strong>Warning</strong> - Usage is between 80-94% of limit
            </div>
            <div class="p-3 bg-red-900/20 border border-red-800 rounded text-red-200 text-sm">
              <strong>Critical</strong> - Usage is 95% or more of limit
            </div>
          </div>

          <h2 class="text-lg font-semibold text-white mt-6">Profile Store Integration</h2>
          <p class="text-sm">
            The component automatically syncs with the profile store and monitors plan_details for plan limits:
          </p>
          <ul class="list-disc list-inside space-y-2 text-sm mt-2">
            <li>users - Team members limit</li>
            <li>limit_requests - Query limit</li>
            <li>storage_limit_gb - Storage limit in GB</li>
            <li>artefacts - Upload limit</li>
          </ul>

          <h2 class="text-lg font-semibold text-white mt-6">Usage Tracking Composable</h2>
          <p class="text-sm">
            You can also use the useUsageTracking composable independently for custom implementations.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const notificationsRef = ref()
</script>
