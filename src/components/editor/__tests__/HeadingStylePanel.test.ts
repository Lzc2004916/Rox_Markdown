


import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HeadingStylePanel from '../HeadingStylePanel.vue'




function clearHeadingStorage(): void {
  for (let l = 1; l <= 6; l++) {
    localStorage.removeItem(`md2card:headingH${l}Size`)
  }
  localStorage.removeItem('md2card:headingH1Align')
}

function mountPanel() {
  return mount(HeadingStylePanel, {
    global: {
      stubs: {
        
      },
    },
  })
}



describe('HeadingStylePanel', () => {
  beforeEach(() => {
    clearHeadingStorage()
  })

  

  it('renders the panel header', () => {
    const wrapper = mountPanel()
    
    expect(wrapper.text()).toContain('H1')
    expect(wrapper.text()).toContain('H6')
  })

  it('renders H1-H6 labels', () => {
    const wrapper = mountPanel()
    for (let l = 1; l <= 6; l++) {
      expect(wrapper.text()).toContain(`H${l}`)
    }
  })

  it('renders H1 alignment section', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('H1 对齐方式')
  })

  it('renders slider inputs for each heading level', () => {
    const wrapper = mountPanel()
    for (let l = 1; l <= 6; l++) {
      const slider = wrapper.find(`#heading-size-slider-h${l}`)
      expect(slider.exists()).toBe(true)
      expect(slider.attributes('type')).toBe('range')
    }
  })

  it('renders number inputs for each heading level', () => {
    const wrapper = mountPanel()
    for (let l = 1; l <= 6; l++) {
      const input = wrapper.find(`#heading-size-input-h${l}`)
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('number')
    }
  })

  it('renders reset all button', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('重置全部')
  })

  

  it('panel body is always visible with heading controls', () => {
    const wrapper = mountPanel()
    
    
    const h1Slider = wrapper.find('#heading-size-slider-h1')
    expect(h1Slider.exists()).toBe(true)

    
    for (let l = 1; l <= 6; l++) {
      expect(wrapper.find(`#heading-size-slider-h${l}`).exists()).toBe(true)
    }
  })

  

  it('updates slider value on input', async () => {
    const wrapper = mountPanel()
    const slider = wrapper.find('#heading-size-slider-h1')
    
    await slider.setValue(42)
    
    expect((slider.element as HTMLInputElement).value).toBe('42')
  })

  it('updates number input value when slider changes', async () => {
    const wrapper = mountPanel()
    const slider = wrapper.find('#heading-size-slider-h1')
    const numInput = wrapper.find('#heading-size-input-h1')

    await slider.setValue(48)
    
    expect((numInput.element as HTMLInputElement).value).toBe('48')
  })

  

  it('clears override when number input is emptied', async () => {
    const wrapper = mountPanel()
    const numInput = wrapper.find('#heading-size-input-h1')

    
    await numInput.setValue('48')
    expect((numInput.element as HTMLInputElement).value).toBe('48')

    
    await numInput.setValue('')
    const v = (numInput.element as HTMLInputElement).value
    expect(Number(v)).toBeGreaterThan(0)
  })

  it('accepts valid numeric input', async () => {
    const wrapper = mountPanel()
    const numInput = wrapper.find('#heading-size-input-h2')

    await numInput.setValue('24')
    expect((numInput.element as HTMLInputElement).value).toBe('24')
  })

  

  it('has individual reset buttons', () => {
    const wrapper = mountPanel()
    
    const resetBtns = wrapper.findAll('button[aria-label^="重置 H"]')
    expect(resetBtns.length).toBe(6)
  })

  it('reset all button exists and is clickable', async () => {
    const wrapper = mountPanel()
    const allButtons = wrapper.findAll('button')
    
    const resetBtn = allButtons.filter(b => b.text().includes('重置全部'))
    expect(resetBtn.length).toBeGreaterThanOrEqual(1)
    await resetBtn[0]!.trigger('click')
    
  })

  

  it('renders left/center/right alignment buttons', () => {
    const wrapper = mountPanel()
    
    const joinDiv = wrapper.find('.join')
    expect(joinDiv.exists()).toBe(true)
    const alignBtns = joinDiv.findAll('button')
    expect(alignBtns.length).toBe(3)
  })

  it('alignment buttons can be clicked', async () => {
    const wrapper = mountPanel()
    const joinDiv = wrapper.find('.join')
    const buttons = joinDiv.findAll('button')

    
    await buttons[1]!.trigger('click')
    
  })
})

