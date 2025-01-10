// import { getAllArticles } from '@/app/utils'
import Link from 'next/link'
import styles from "./page.module.css";


export default async function Home() {
  // const data = await getAllArticles()

  return (
    <main className={styles.main}>
      <Link href="/log">Log</Link>
      
    </main>
  );
}
