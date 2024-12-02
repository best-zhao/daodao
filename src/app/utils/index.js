
export async function getAccessToken() {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.APP_ID}&secret=${process.env.APP_SECRET}`;
  const data = await fetch(url).then(res=>res.json())//.catch(e=>({}))
  console.log('token', data)
  return data.access_token;
}

export async function getArticles(accessToken, offset = 0, count = 20) {
  const url = `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${accessToken}`;
  const data = {
    type: 'news',
    offset,
    count,
  };
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(res=>res.json()).catch(e=>({}))
  return res;
}

export async function getAllArticles() {
  const accessToken = await getAccessToken();
  const pageSize = 50
  let allArticles = [];
  let offset = 0;
  let articles;

  do {
    articles = await getArticles(accessToken, offset);
    console.log(11, accessToken, articles)
    allArticles = allArticles.concat(articles.item);
    offset += pageSize; 
  } while (articles.item.length === pageSize);

  return allArticles;
}