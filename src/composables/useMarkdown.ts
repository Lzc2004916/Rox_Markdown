import { ref, type Ref } from 'vue'


export function useMarkdown(source: Ref<string>): {
  source: Ref<string>
  
  currentPage: Ref<number>
} {
  const currentPage = ref<number>(0)

  return { source, currentPage }
}