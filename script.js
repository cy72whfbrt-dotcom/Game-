document.querySelectorAll('.nav-item[data-nav]').forEach((el) => {
  el.addEventListener('click', () => {
    console.log('Navigate to:', el.dataset.nav);
  });
});

document.querySelector('.anvil-center')?.addEventListener('click', () => {
  console.log('Navigate to: forge');
});
