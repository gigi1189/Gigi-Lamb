/* eslint-disable */
if ((typeof window !== 'undefined') && window.performance && window.performance.mark) {
  performance.mark('interactiveSubResourceTime');
  window.dataLayer && window.dataLayer.push({
    event: 'performance',
    pageview: {
      performance: {
        interactiveSubResourceTime: Math.round(performance.getEntriesByName('interactiveSubResourceTime')[0].startTime),
      },
    }
  });
}
