const fs = require('fs');

// 1. Cập nhật apps/web/src/lib/auth.ts
const authPath = 'apps/web/src/lib/auth.ts';
let authContent = fs.readFileSync(authPath, 'utf-8');
if (!authContent.includes('updateStoredUserPoints')) {
  const addFn = 
`\r\nexport const updateStoredUserPoints = (newPoints: number) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return;
    try {
      const user = JSON.parse(raw) as User;
      user.loyaltyPoints = newPoints;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }
};\r\n`;
  authContent += addFn;
  fs.writeFileSync(authPath, authContent, 'utf-8');
  console.log('Updated apps/web/src/lib/auth.ts');
}

// 2. Cập nhật apps/web/src/app/checkout/page.tsx
const checkoutPath = 'apps/web/src/app/checkout/page.tsx';
let checkoutContent = fs.readFileSync(checkoutPath, 'utf-8');
if (!checkoutContent.includes('updateStoredUserPoints')) {
  checkoutContent = checkoutContent.replace(
    "import { getAuthToken } from '@/lib/auth';",
    "import { getAuthToken, updateStoredUserPoints } from '@/lib/auth';"
  );
  
  const oldSuccessBlock = 
`      if (paymentSucceeded) {
        setOrderPaidResult({
          orderId: returnedOrderId,
          orderCode: currentOrderCode || \`ORD-\${returnedOrderId}\`,
          status: 'PAID',
          totalPaid: displayAmount,
          pointsEarned: expectedPointsEarned,
        });
        clearCart();
      }`.replace(/\r?\n/g, '\r\n');

  const newSuccessBlock = 
`      if (paymentSucceeded) {
        setOrderPaidResult({
          orderId: returnedOrderId,
          orderCode: currentOrderCode || \`ORD-\${returnedOrderId}\`,
          status: 'PAID',
          totalPaid: displayAmount,
          pointsEarned: expectedPointsEarned,
        });
        clearCart();

        if (token) {
          fetch(\`\${apiUrl}/promotions/loyalty/me\`, {
            headers: { Authorization: \`Bearer \${token}\` },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && typeof data.points === 'number') {
                updateStoredUserPoints(data.points);
                setUserAvailablePoints(data.points);
              }
            })
            .catch(() => {});
        }
      }`.replace(/\r?\n/g, '\r\n');

  if (checkoutContent.includes(oldSuccessBlock)) {
    checkoutContent = checkoutContent.replace(oldSuccessBlock, newSuccessBlock);
    fs.writeFileSync(checkoutPath, checkoutContent, 'utf-8');
    console.log('Updated apps/web/src/app/checkout/page.tsx (CRLF)');
  } else {
    // Thử với LF
    const oldLF = oldSuccessBlock.replace(/\r\n/g, '\n');
    const newLF = newSuccessBlock.replace(/\r\n/g, '\n');
    if (checkoutContent.includes(oldLF)) {
      checkoutContent = checkoutContent.replace(oldLF, newLF);
      fs.writeFileSync(checkoutPath, checkoutContent, 'utf-8');
      console.log('Updated apps/web/src/app/checkout/page.tsx (LF)');
    } else {
      console.error('Could not find oldSuccessBlock in checkout/page.tsx');
    }
  }
}

// 3. Cập nhật apps/web/src/app/page.tsx
const pagePath = 'apps/web/src/app/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf-8');
if (!pageContent.includes('updateStoredUserPoints')) {
  pageContent = pageContent.replace(
    "import { clearAuthData, getStoredUser, User } from '@/lib/auth';",
    "import { clearAuthData, getAuthToken, getStoredUser, updateStoredUserPoints, User } from '@/lib/auth';"
  );

  const oldEffect = 
`  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }

    fetchProducts();
  }, []);`.replace(/\r?\n/g, '\r\n');

  const newEffect = 
`  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      const token = getAuthToken();
      if (token) {
        fetch(\`\${apiUrl}/promotions/loyalty/me\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && typeof data.points === 'number') {
              setCurrentUser((prev) => (prev ? { ...prev, loyaltyPoints: data.points } : null));
              updateStoredUserPoints(data.points);
            }
          })
          .catch(() => {});
      }
    }

    fetchProducts();
  }, [apiUrl]);`.replace(/\r?\n/g, '\r\n');

  if (pageContent.includes(oldEffect)) {
    pageContent = pageContent.replace(oldEffect, newEffect);
    fs.writeFileSync(pagePath, pageContent, 'utf-8');
    console.log('Updated apps/web/src/app/page.tsx (CRLF)');
  } else {
    const oldLF = oldEffect.replace(/\r\n/g, '\n');
    const newLF = newEffect.replace(/\r\n/g, '\n');
    if (pageContent.includes(oldLF)) {
      pageContent = pageContent.replace(oldLF, newLF);
      fs.writeFileSync(pagePath, pageContent, 'utf-8');
      console.log('Updated apps/web/src/app/page.tsx (LF)');
    } else {
      console.error('Could not find oldEffect in page.tsx');
    }
  }
}

