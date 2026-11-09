import {test,expect} from '@playwright/test';

for(const theme of ['light','dark'] as const)test(`${theme} Climate vinyl visual comparison on desktop and phone`,async({page})=>{
  await page.goto('/');await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme);
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    for(const side of ['a','b']){
      await page.getByRole('button',{name:side==='a'?'Side A: hear the picture':'Side B: hear the measurements',exact:true}).click();
      await expect(page.locator('.jb-deck')).toHaveAttribute('data-record-side',side);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.evaluate(()=>scrollTo(0,0));
      for(const detail of ['page','vinyl']){
        const path=test.info().outputPath(`${theme}-${viewport.width}-side-${side}-${detail}.png`);
        if(detail==='page')await page.screenshot({path,fullPage:true});else await page.locator('.jb-earth-record').screenshot({path});
        await test.info().attach(`${theme}-${viewport.width}-side-${side}-${detail}`,{path,contentType:'image/png'});
      }
    }
  }
});
