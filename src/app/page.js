import { getAllArticles } from '@/utils'
import styles from "./page.module.css";


export default async function Home() {
  const data = await getAllArticles()

  return (
    <main className={styles.main}>
      <a href="">Links</a>
      <div>
        {JSON.stringify(data, null, 2)}
      </div>
    </main>
  );
}
