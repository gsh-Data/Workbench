<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { NodeViewWrapper } from '@tiptap/vue-3';

const props = defineProps({
  editor: Object,
  node: Object,
  decorations: Array,
  selected: Boolean,
  extension: Object,
  getPos: Function,
  updateAttributes: Function,
  deleteNode: Function,
});

const imageRef = ref(null);
const isResizing = ref(false);
const startWidth = ref(0);
const startX = ref(0);
const currentWidth = ref(null);

const displayWidth = computed(() => {
  if (isResizing.value && currentWidth.value !== null) {
    return `${currentWidth.value}px`;
  }
  if (props.node.attrs.width) {
    return `${props.node.attrs.width}px`;
  }
  return 'auto';
});

const onDragStart = (e) => {
  e.preventDefault();
  isResizing.value = true;
  startX.value = e.clientX;
  startWidth.value = imageRef.value.clientWidth;
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', onDragEnd);
};

const onDrag = (e) => {
  if (!isResizing.value) return;
  const dx = e.clientX - startX.value;
  // Let's drag from right side, so dx directly adds to width
  const newWidth = Math.max(100, startWidth.value + dx); // min width 100px
  
  // apply style visually during drag
  currentWidth.value = newWidth;
};

const onDragEnd = (e) => {
  if (!isResizing.value) return;
  isResizing.value = false;
  
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', onDragEnd);
  
  // Update Tiptap model
  props.updateAttributes({ width: currentWidth.value });
};
</script>

<template>
  <node-view-wrapper class="resizable-image-wrapper inline-block relative my-2" :class="{ 'ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-primary rounded-sm': selected }">
    <div class="relative group inline-block max-w-full">
      <img
        ref="imageRef"
        :src="node.attrs.src"
        :alt="node.attrs.alt"
        :title="node.attrs.title"
        :style="{ width: displayWidth, height: 'auto' }"
        class="block rounded-lg shadow-sm border-2 border-transparent transition-colors max-w-full"
        :class="{ 'border-accent-primary': selected }"
        @click="editor.commands.setNodeSelection(getPos())"
      />
      
      <!-- Resize Handle (Bottom Right) -->
      <div
        v-if="editor.isEditable"
        class="absolute bottom-0 right-0 w-8 h-8 bg-accent-primary shadow-lg rounded-tl-xl rounded-br-lg cursor-nwse-resize flex items-center justify-center pointer-events-auto z-10 transition-opacity"
        :class="selected || isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
        @mousedown.stop="onDragStart"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="21 15 21 21 15 21"></polyline>
          <line x1="21" y1="21" x2="15" y2="15"></line>
        </svg>
      </div>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.resizable-image-wrapper {
  max-width: 100%;
}
</style>
