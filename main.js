const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const CART_KEY = "dfscripts_cart";
const DISCORD_POPUP_KEY = "dfscripts_discord_popup_closed";
const OFFER_POPUP_KEY = "dfscripts_offer_popup_closed";

let discordLogin = null;
let discordProfile = null;

function refreshAuthElements() {
    discordLogin = $("#discordLogin") || $(".discord-login");
    discordProfile = $("#discordProfile");
}

let cart = [];
let searchOverlay = null;
let searchInput = null;

try {
    const savedCart = localStorage.getItem(CART_KEY);

    if (savedCart) {
        const parsed = JSON.parse(savedCart);

        if (Array.isArray(parsed)) {
            cart = parsed;
        }
    }
} catch (error) {
    console.error("Cart load error:", error);
    cart = [];
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateYear() {
    const year = $("#year");

    if (year) {
        year.textContent =
            new Date().getFullYear();
    }
}

function showToast(message) {
    const toast = $("#toast");

    if (!toast) {
        return;
    }

    const text =
        toast.querySelector(".toast-text");

    if (text) {
        text.textContent = message;
    } else {
        toast.textContent = message;
    }

    toast.classList.add("show");

    clearTimeout(showToast.timeout);

    showToast.timeout =
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2600);
}

function saveCart() {
    try {
        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );
    } catch (error) {
        console.error(
            "Cart save error:",
            error
        );
    }
}

function getProductData(element) {
    if (!element) {
        return null;
    }

    const name =
        element.dataset.name ||
        element.dataset.product ||
        element.getAttribute("data-item");

    if (!name) {
        return null;
    }

    const rawPrice =
        element.dataset.price;

    const price =
        rawPrice === "" ||
        rawPrice == null
            ? null
            : Number.parseFloat(rawPrice);

    const image =
        element.dataset.image ||
        element.getAttribute(
            "data-product-image"
        ) ||
        "/images/logo.png";

    return {
        id:
            element.dataset.id ||
            name
                .toLowerCase()
                .replace(/[^a-z0-9]+/gi, "-")
                .replace(/^-|-$/g, ""),

        name,

        price,

        priceLabel:
            element.dataset.priceLabel ||
            (
                Number.isFinite(price)
                    ? `€${price.toFixed(2)}`
                    : "SOON"
            ),

        image,

        category:
            element.dataset.category ||
            "RESOURCE",

        description:
            element.dataset.description ||
            "",

        features:
            element.dataset.features || ""
    };
}

function getCartCount() {
    return cart.reduce(
        (total, item) =>
            total +
            Math.max(
                1,
                Number(item.quantity) || 1
            ),
        0
    );
}

function getCartTotal() {
    return cart.reduce(
        (total, item) =>
            total +
            (
                Number(item.price) || 0
            ) *
            Math.max(
                1,
                Number(item.quantity) || 1
            ),
        0
    );
}

function updateCartUI() {
    const count =
        getCartCount();

    const total =
        getCartTotal();

    $$(
        "[data-cart-count], #cartCount"
    ).forEach(element => {
        element.textContent =
            String(count);
    });

    $$(
        "[data-cart-total], #cartTotal"
    ).forEach(element => {
        element.textContent =
            `€${total.toFixed(2)}`;
    });

    const cartButton =
        $("#cartButton");

    if (cartButton) {
        cartButton.classList.toggle(
            "has-items",
            count > 0
        );
    }
}

function addToCart(product) {
    if (
        !product ||
        product.price == null ||
        !Number.isFinite(
            Number(product.price)
        )
    ) {
        showToast(
            "Tento produkt zatím není dostupný."
        );

        return;
    }

    const existing =
        cart.find(
            item =>
                item.id === product.id
        );

    if (existing) {
        existing.quantity =
            Math.max(
                1,
                Number(existing.quantity) || 1
            ) + 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            priceLabel:
                product.priceLabel,
            image: product.image,
            quantity: 1
        });
    }

    saveCart();
    renderCart();
    updateCartUI();

    showToast(
        `${product.name} byl přidán do košíku.`
    );
}

function removeFromCart(id) {
    cart =
        cart.filter(
            item =>
                item.id !== id
        );

    saveCart();
    renderCart();
    updateCartUI();
}

function changeQuantity(id, amount) {
    const item =
        cart.find(
            entry =>
                entry.id === id
        );

    if (!item) {
        return;
    }

    item.quantity =
        Math.max(
            1,
            (
                Number(item.quantity) || 1
            ) + amount
        );

    saveCart();
    renderCart();
    updateCartUI();
}

function clearCart() {
    cart = [];

    saveCart();
    renderCart();
    updateCartUI();

    showToast(
        "Košík byl vyprázdněn."
    );
}

function openCart() {
    const drawer =
        $("#cartDrawer");

    const overlay =
        $("#cartOverlay");

    if (!drawer) {
        return;
    }

    drawer.classList.add("open");

    overlay?.classList.add(
        "open"
    );

    document.body.classList.add(
        "cart-open"
    );
}

function closeCart() {
    const drawer =
        $("#cartDrawer");

    const overlay =
        $("#cartOverlay");

    drawer?.classList.remove(
        "open"
    );

    overlay?.classList.remove(
        "open"
    );

    document.body.classList.remove(
        "cart-open"
    );
}

function renderCart() {
    const list =
        $("#cartItems") ||
        $("#cartList") ||
        $("[data-cart-list]");

    const empty =
        $("#cartEmpty") ||
        $("[data-cart-empty]");

    if (!list) {
        updateCartUI();
        return;
    }

    if (!cart.length) {
        list.innerHTML = "";

        if (empty) {
            empty.style.display =
                "";
        }

        updateCartUI();
        return;
    }

    if (empty) {
        empty.style.display =
            "none";
    }

    list.innerHTML =
        cart
            .map(
                item => `
                    <div
                        class="cart-item"
                        data-cart-id="${escapeHtml(item.id)}"
                    >
                        <div class="cart-item-icon">
                            <img
                                src="${escapeHtml(item.image || "/images/logo.png")}"
                                alt=""
                            >
                        </div>

                        <div class="cart-item-info">
                            <strong>
                                ${escapeHtml(item.name)}
                            </strong>

                            <small>
                                €${Number(item.price || 0).toFixed(2)}
                            </small>
                        </div>

                        <div class="cart-item-controls">
                            <button
                                type="button"
                                data-cart-minus="${escapeHtml(item.id)}"
                                aria-label="Decrease quantity"
                            >
                                −
                            </button>

                            <span>
                                ${Math.max(
                                    1,
                                    Number(item.quantity) || 1
                                )}
                            </span>

                            <button
                                type="button"
                                data-cart-plus="${escapeHtml(item.id)}"
                                aria-label="Increase quantity"
                            >
                                +
                            </button>
                        </div>

                        <button
                            type="button"
                            class="remove-item"
                            data-cart-remove="${escapeHtml(item.id)}"
                            aria-label="Remove"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `
            )
            .join("");

    updateCartUI();
}

function setupCart() {
    const cartButton =
        $("#cartButton") ||
        $("[data-cart-open]") ||
        $(".cart-button") ||
        $(".cart-btn") ||
        $(".header-cart") ||
        $(".nav-cart");

    const closeButton =
        $("#cartClose") ||
        $("[data-cart-close]");

    const overlay =
        $("#cartOverlay");

    cartButton?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            openCart();
        }
    );

    closeButton?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            closeCart();
        }
    );

    overlay?.addEventListener(
        "click",
        event => {
            event.preventDefault();

            closeCart();
        }
    );
}

function setupCartDelegation() {
    document.addEventListener(
        "click",
        event => {
            const minus =
                event.target.closest(
                    "[data-cart-minus]"
                );

            if (minus) {
                event.preventDefault();

                changeQuantity(
                    minus.dataset.cartMinus,
                    -1
                );

                return;
            }

            const plus =
                event.target.closest(
                    "[data-cart-plus]"
                );

            if (plus) {
                event.preventDefault();

                changeQuantity(
                    plus.dataset.cartPlus,
                    1
                );

                return;
            }

            const remove =
                event.target.closest(
                    "[data-cart-remove], .remove-item"
                );

            if (remove) {
                event.preventDefault();

                removeFromCart(
                    remove.dataset.cartRemove ||
                    remove.closest(
                        "[data-cart-id]"
                    )?.dataset.cartId
                );

                return;
            }

            const clear =
                event.target.closest(
                    "[data-cart-clear]"
                );

            if (clear) {
                event.preventDefault();

                clearCart();
            }
        }
    );
}

function setupMobileMenu() {
    const button =
        $("#mobileToggle") ||
        $("[data-mobile-menu]") ||
        $(".mobile-toggle") ||
        $(".menu-toggle");

    const menu =
        $("#mobileMenu") ||
        $("[data-mobile-menu-panel]") ||
        $(".mobile-menu") ||
        $(".mobile-nav");

    if (!button || !menu) {
        return;
    }

    button.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            const open =
                menu.classList.toggle(
                    "open"
                );

            button.setAttribute(
                "aria-expanded",
                String(open)
            );

            button.innerHTML =
                open
                    ? '<i class="fa-solid fa-xmark"></i>'
                    : '<i class="fa-solid fa-bars"></i>';
        }
    );

    menu.addEventListener(
        "click",
        event => {
            const link =
                event.target.closest(
                    "a"
                );

            if (!link) {
                return;
            }

            menu.classList.remove(
                "open"
            );

            button.setAttribute(
                "aria-expanded",
                "false"
            );

            button.innerHTML =
                '<i class="fa-solid fa-bars"></i>';
        }
    );

    document.addEventListener(
        "click",
        event => {
            if (
                !menu.contains(
                    event.target
                ) &&
                !button.contains(
                    event.target
                )
            ) {
                menu.classList.remove(
                    "open"
                );

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );

                button.innerHTML =
                    '<i class="fa-solid fa-bars"></i>';
            }
        }
    );
}

function setupDiscordLogin() {
    refreshAuthElements();

    const loginButtons = new Set();

    if (discordLogin) {
        loginButtons.add(discordLogin);
    }

    document.querySelectorAll(
        '#discordLogin, .discord-login, [data-discord-login], [data-action="discord-login"], .login-discord, .discord-login-button'
    ).forEach(element => loginButtons.add(element));

    loginButtons.forEach(button => {
        if (button.dataset.discordLoginReady === "true") return;
        button.dataset.discordLoginReady = "true";

        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const href = button.getAttribute("href");
            if (href && href !== "#" && !href.toLowerCase().startsWith("javascript:")) {
                window.location.href = href;
                return;
            }

            window.location.href = "/auth/discord";
        });
    });
}

function setupDiscordProfile() {
    refreshAuthElements();

    if (
        !discordProfile ||
        discordProfile.dataset.profileReady ===
            "true"
    ) {
        return;
    }

    const toggle =
        $("#profileToggle", discordProfile);

    const dropdown =
        $(".user-dropdown", discordProfile);

    if (!toggle || !dropdown) {
        return;
    }

    discordProfile.dataset.profileReady =
        "true";

    toggle.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            const open =
                dropdown.classList.toggle(
                    "open"
                );

            discordProfile.classList.toggle(
                "profile-open",
                open
            );

            toggle.setAttribute(
                "aria-expanded",
                String(open)
            );
        }
    );

    dropdown.addEventListener(
        "click",
        event => {
            event.stopPropagation();
        }
    );

    document.addEventListener(
        "click",
        event => {
            if (
                !discordProfile.contains(
                    event.target
                )
            ) {
                dropdown.classList.remove(
                    "open"
                );

                discordProfile.classList.remove(
                    "profile-open"
                );

                toggle.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        }
    );
}

function showDiscordLogin() {
    refreshAuthElements();

    if (discordLogin) {
        discordLogin.style.display =
            "flex";
    }

    if (discordProfile) {
        discordProfile.style.display =
            "none";

        const dropdown =
            $(".user-dropdown", discordProfile);

        const toggle =
            $("#profileToggle", discordProfile);

        dropdown?.classList.remove(
            "open"
        );

        discordProfile.classList.remove(
            "profile-open"
        );

        toggle?.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}

function resolveDiscordAvatar(user) {
    if (
        user?.avatar &&
        /^https?:\/\//i.test(
            user.avatar
        )
    ) {
        return user.avatar;
    }

    if (
        user?.avatar &&
        user?.id
    ) {
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    }

    return "https://cdn.discordapp.com/embed/avatars/0.png";
}

const ROLE_IDS = {
    "1543356076047474788":
        "Project CEO",

    "1543356104652759132":
        "Customer",

    "1543356120460951666":
        "Member"
};

const ROLE_PRIORITY = [
    "1543356076047474788",
    "1543356104652759132",
    "1543356120460951666"
];

function resolveDiscordRole(user) {
    const roleSources = [
        user?.roles,
        user?.roleIds,
        user?.guildRoles
    ];

    for (
        const source of roleSources
    ) {
        if (!Array.isArray(source)) {
            continue;
        }

        for (
            const roleId of ROLE_PRIORITY
        ) {
            if (
                source.some(
                    role =>
                        String(
                            role?.id ??
                            role
                        ) === roleId
                )
            ) {
                return ROLE_IDS[
                    roleId
                ];
            }
        }
    }

    if (
        user?.role &&
        user.role !== "Member"
    ) {
        return user.role;
    }

    return "Member";
}

function enhanceAccountPanel(
    user,
    role
) {
    refreshAuthElements();

    if (!discordProfile) {
        return;
    }

    const dropdown =
        $(".user-dropdown", discordProfile);

    if (!dropdown) {
        return;
    }

    const username =
        user?.global_name ||
        user?.username ||
        "Member";

    const avatar =
        resolveDiscordAvatar(user);

    const purchases =
        Array.isArray(
            user?.purchases
        )
            ? user.purchases.length
            : Number(
                  user?.purchases || 0
              );

    const downloads =
        Array.isArray(
            user?.downloads
        )
            ? user.downloads.length
            : Number(
                  user?.downloads || 0
              );

    dropdown.innerHTML =
        "";

    dropdown.classList.add(
        "dfs-account-enhanced"
    );

    const panel =
        document.createElement(
            "div"
        );

    panel.className =
        "dfs-account-panel";

    panel.innerHTML = `
        <div class="dfs-account-head">
            <div class="dfs-account-avatar-wrap">
                <img
                    class="dfs-account-avatar"
                    src="${escapeHtml(avatar)}"
                    alt="${escapeHtml(username)} avatar"
                >

                <span class="dfs-account-online"></span>
            </div>

            <div class="dfs-account-identity">
                <strong>
                    ${escapeHtml(username)}
                </strong>

                <span>
                    <i class="fa-solid fa-circle"></i>
                    Discord connected
                </span>
            </div>
        </div>

        <div class="dfs-account-divider"></div>

        <div class="dfs-account-label">
            ACCOUNT OVERVIEW
        </div>

        <div class="dfs-account-stats">
            <div class="dfs-account-stat">
                <strong>
                    ${
                        Number.isFinite(
                            purchases
                        )
                            ? purchases
                            : 0
                    }
                </strong>

                <span>
                    Purchases
                </span>
            </div>

            <div class="dfs-account-stat">
                <strong>
                    ${
                        Number.isFinite(
                            downloads
                        )
                            ? downloads
                            : 0
                    }
                </strong>

                <span>
                    Downloads
                </span>
            </div>

            <div class="dfs-account-stat">
                <strong>
                    DFS
                </strong>

                <span>
                    Account
                </span>
            </div>
        </div>

        <div class="dfs-account-role">
            <span class="dfs-account-role-icon">
                <i class="fa-solid fa-shield-halved"></i>
            </span>

            <div>
                <small>
                    DISCORD ROLE
                </small>

                <strong>
                    ${escapeHtml(role)}
                </strong>
            </div>
        </div>

        <div class="dfs-account-divider"></div>

        <div class="dfs-account-actions">

            <button
                class="dfs-account-action"
                type="button"
                data-account-action="purchases"
            >
                <span>
                    <i class="fa-solid fa-bag-shopping"></i>
                </span>

                <div>
                    <strong>
                        My purchases
                    </strong>

                    <small>
                        View your DFScripts purchases
                    </small>
                </div>

                <i class="fa-solid fa-chevron-right"></i>
            </button>

            <button
                class="dfs-account-action"
                type="button"
                data-account-action="downloads"
            >
                <span>
                    <i class="fa-solid fa-download"></i>
                </span>

                <div>
                    <strong>
                        Downloads
                    </strong>

                    <small>
                        Access your available resources
                    </small>
                </div>

                <i class="fa-solid fa-chevron-right"></i>
            </button>

        </div>

        <div class="dfs-account-divider"></div>

        <button
            class="dfs-account-logout"
            type="button"
            id="dfsAccountLogout"
        >
            <span>
                <i class="fa-solid fa-right-from-bracket"></i>
            </span>

            <strong>
                Logout
            </strong>
        </button>
    `;

    dropdown.appendChild(
        panel
    );

    panel
        .querySelector(
            "#dfsAccountLogout"
        )
        ?.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                window.location.href =
                    "/auth/logout";
            }
        );

    panel
        .querySelectorAll(
            "[data-account-action]"
        )
        .forEach(
            button => {
                button.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                            button.dataset.accountAction ===
                            "purchases"
                        ) {
                            showToast(
                                "Purchases will be available in your account."
                            );
                        } else {
                            showToast(
                                "Your downloads will appear here after purchase."
                            );
                        }
                    }
                );
            }
        );
}

function showDiscordProfile(user) {
    refreshAuthElements();

    if (
        !user ||
        !discordProfile
    ) {
        showDiscordLogin();

        return;
    }

    if (discordLogin) {
        discordLogin.style.display =
            "none";
    }

    discordProfile.style.display =
        "flex";

    const username =
        user.global_name ||
        user.username ||
        "Member";

    const role =
        resolveDiscordRole(user);

    const avatar =
        resolveDiscordAvatar(user);

    $$(
        "[data-discord-avatar]",
        discordProfile
    ).forEach(
        element => {
            element.src =
                avatar;

            element.alt =
                `${username} avatar`;
        }
    );

    $$(
        "[data-discord-username]",
        discordProfile
    ).forEach(
        element => {
            element.textContent =
                username;
        }
    );

    $$(
        "[data-discord-role]",
        discordProfile
    ).forEach(
        element => {
            element.textContent =
                role.toUpperCase();
        }
    );

    $$(
        "[data-profile-role-name]",
        discordProfile
    ).forEach(
        element => {
            element.textContent =
                role.toUpperCase();
        }
    );

    enhanceAccountPanel(
        user,
        role
    );

    setupDiscordProfile();
}

async function loadDiscordUser() {
    refreshAuthElements();

    try {
        const response =
            await fetch(
                "/api/auth/me",
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );

        if (!response.ok) {
            showDiscordLogin();

            return;
        }

        const data =
            await response.json();

        if (
            !data?.authenticated ||
            !data.user
        ) {
            showDiscordLogin();

            return;
        }

        showDiscordProfile(
            data.user
        );
    } catch (error) {
        console.error(
            "Discord auth error:",
            error
        );

        showDiscordLogin();
    }
}

function hidePopup(
    popup,
    storageKey
) {
    if (!popup) {
        return;
    }

    popup.classList.add(
        "popup-hidden"
    );

    popup.setAttribute(
        "aria-hidden",
        "true"
    );

    popup.style.setProperty(
        "display",
        "none",
        "important"
    );

    popup.setAttribute(
        "hidden",
        ""
    );

    if (storageKey) {
        try {
            sessionStorage.setItem(
                storageKey,
                "1"
            );
        } catch (_) {}
    }
}

function showPopup(popup) {
    if (!popup) {
        return;
    }

    popup.removeAttribute(
        "hidden"
    );

    popup.classList.remove(
        "popup-hidden"
    );

    popup.setAttribute(
        "aria-hidden",
        "false"
    );

    popup.style.removeProperty(
        "display"
    );
}

function setupPopups() {
    const signin =
        $("#signinPop");

    const discount =
        $("#discountPop");

    if (
        !signin &&
        !discount
    ) {
        return;
    }

    try {
        if (
            signin &&
            sessionStorage.getItem(
                DISCORD_POPUP_KEY
            )
        ) {
            hidePopup(
                signin
            );
        }

        if (
            discount &&
            sessionStorage.getItem(
                OFFER_POPUP_KEY
            )
        ) {
            hidePopup(
                discount
            );
        }
    } catch (_) {}

    const closeSignin =
        $("#closeSignin");

    const later =
        $("#later");

    const closeDiscount =
        $("#closeDiscount");

    closeSignin?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            hidePopup(
                signin,
                DISCORD_POPUP_KEY
            );
        }
    );

    later?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            hidePopup(
                signin,
                DISCORD_POPUP_KEY
            );
        }
    );

    closeDiscount?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            hidePopup(
                discount,
                OFFER_POPUP_KEY
            );
        }
    );

    $$(
        "[data-popup-close]"
    ).forEach(
        button => {
            if (
                button.dataset.popupCloseReady ===
                "true"
            ) {
                return;
            }

            button.dataset.popupCloseReady =
                "true";

            button.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    const popup =
                        button.closest(
                            ".discord-pop, .offer-pop, .popup, .modal, aside"
                        );

                    if (popup) {
                        hidePopup(
                            popup
                        );
                    }
                }
            );
        }
    );

    $$(
        "[data-popup-open]"
    ).forEach(
        button => {
            if (
                button.dataset.popupOpenReady ===
                "true"
            ) {
                return;
            }

            button.dataset.popupOpenReady =
                "true";

            button.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    const popup =
                        document.getElementById(
                            button.dataset.popupOpen
                        );

                    if (popup) {
                        showPopup(
                            popup
                        );
                    }
                }
            );
        }
    );
}

function createSearchOverlay() {
    if (searchOverlay) {
        return;
    }

    searchOverlay =
        document.createElement(
            "div"
        );

    searchOverlay.className =
        "search-overlay";

    searchOverlay.innerHTML = `
        <div
            class="search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Search DFScripts"
        >

            <div class="search-modal-top">
                <div>
                    <span>
                        DFSCRIPTS
                    </span>

                    <strong>
                        Search
                    </strong>
                </div>

                <button
                    class="search-close"
                    type="button"
                    aria-label="Close search"
                >
                    ×
                </button>
            </div>

            <div class="search-field">
                <i class="fa-solid fa-magnifying-glass"></i>

                <input
                    type="search"
                    placeholder="Search resources..."
                    autocomplete="off"
                >

                <kbd>
                    ESC
                </kbd>
            </div>

            <div class="search-results"></div>
        </div>
    `;

    document.body.appendChild(
        searchOverlay
    );

    searchInput =
        $(".search-field input");

    const close =
        $(".search-close");

    const results =
        $(".search-results");

    function closeSearch() {
        searchOverlay.classList.remove(
            "open"
        );

        document.body.classList.remove(
            "search-open"
        );

        if (searchInput) {
            searchInput.value =
                "";
        }
    }

    close?.addEventListener(
        "click",
        event => {
            event.preventDefault();

            closeSearch();
        }
    );

    searchOverlay.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                searchOverlay
            ) {
                closeSearch();
            }
        }
    );

    searchInput?.addEventListener(
        "input",
        () => {
            renderSearchResults(
                searchInput.value
            );
        }
    );

    searchInput?.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape"
            ) {
                closeSearch();
            }
        }
    );

    searchOverlay._close =
        closeSearch;

    searchOverlay._results =
        results;
}

function renderSearchResults(
    query = ""
) {
    if (!searchOverlay) {
        return;
    }

    const results =
        searchOverlay._results;

    if (!results) {
        return;
    }

    const normalized =
        query
            .trim()
            .toLowerCase();

    const searchable =
        $$(
            ".product-card, .showcase-card, .compatibility-card, .service-row, .feature-item"
        );

    const matches =
        searchable.filter(
            item =>
                !normalized ||
                item.textContent
                    .toLowerCase()
                    .includes(
                        normalized
                    )
        );

    if (!matches.length) {
        results.innerHTML = `
            <div class="search-empty">
                <i class="fa-solid fa-magnifying-glass"></i>
                <span>
                    No results found.
                </span>
            </div>
        `;

        return;
    }

    results.innerHTML =
        matches
            .map(
                (item, index) => {
                    const title =
                        $("h3", item)
                            ?.textContent
                            ?.trim() ||
                        $("strong, b", item)
                            ?.textContent
                            ?.trim() ||
                        "DFS Resource";

                    const meta =
                        $(".tag-row", item)
                            ?.textContent
                            ?.trim() ||
                        $(".showcase-info span", item)
                            ?.textContent
                            ?.trim() ||
                        "RESOURCE";

                    return `
                        <button
                            type="button"
                            class="search-result"
                            data-search-index="${index}"
                        >
                            <span class="search-result-number">
                                ${String(
                                    index + 1
                                ).padStart(
                                    2,
                                    "0"
                                )}
                            </span>

                            <span class="search-result-copy">
                                <strong>
                                    ${escapeHtml(title)}
                                </strong>

                                <small>
                                    ${escapeHtml(meta)}
                                </small>
                            </span>

                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    `;
                }
            )
            .join("");

    $$(".search-result", results)
        .forEach(
            (button, index) => {
                button.addEventListener(
                    "click",
                    () => {
                        const target =
                            matches[index];

                        searchOverlay._close?.();

                        target?.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "center"
                        });

                        target?.classList.add(
                            "search-highlight"
                        );

                        setTimeout(
                            () => {
                                target?.classList.remove(
                                    "search-highlight"
                                );
                            },
                            1300
                        );
                    }
                );
            }
        );
}

function openSearch() {
    createSearchOverlay();

    if (!searchOverlay) {
        return;
    }

    renderSearchResults("");

    searchOverlay.classList.add(
        "open"
    );

    searchOverlay.style.setProperty(
        "display",
        "flex",
        "important"
    );

    document.body.classList.add(
        "search-open"
    );

    setTimeout(
        () => {
            searchInput?.focus();
        },
        50
    );
}

function setupSearch() {
    createSearchOverlay();

    const button =
        $("#searchButton");

    if (
        !button ||
        button.dataset.searchReady ===
            "true"
    ) {
        return;
    }

    button.dataset.searchReady =
        "true";

    button.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            openSearch();
        }
    );
}

function setupNavigation() {
    const navLinks =
        $$("a[data-section]");

    const sections = [
        "home",
        "store",
        "free",
        "deals",
        "development",
        "docs"
    ]
        .map(
            id => ({
                id,
                element:
                    document.getElementById(
                        id
                    )
            })
        )
        .filter(
            section =>
                section.element
        );

    if (!navLinks.length) {
        return;
    }

    let manualActiveUntil =
        0;

    function setActive(id) {
        navLinks.forEach(
            link => {
                link.classList.toggle(
                    "active",
                    link.dataset.section ===
                        id
                );
            }
        );
    }

    function getCurrentSection() {
        if (
            window.scrollY <=
            120
        ) {
            return "home";
        }

        const marker =
            window.scrollY +
            Math.min(
                220,
                window.innerHeight *
                    0.28
            );

        let current =
            sections[0]?.id ||
            "home";

        for (
            const section of sections
        ) {
            const top =
                section.element
                    .getBoundingClientRect()
                    .top +
                window.scrollY;

            if (
                top <= marker
            ) {
                current =
                    section.id;
            }
        }

        return current;
    }

    function updateFromScroll() {
        if (
            Date.now() <
            manualActiveUntil
        ) {
            return;
        }

        setActive(
            getCurrentSection()
        );
    }

    navLinks.forEach(
        link => {
            link.addEventListener(
                "click",
                event => {
                    const href =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        !href ||
                        !href.startsWith(
                            "#"
                        )
                    ) {
                        return;
                    }

                    const id =
                        link.dataset.section ||
                        href.slice(1);

                    const target =
                        document.getElementById(
                            id
                        );

                    if (!target) {
                        return;
                    }

                    event.preventDefault();

                    manualActiveUntil =
                        Date.now() +
                        900;

                    setActive(id);

                    if (
                        id === "home"
                    ) {
                        window.scrollTo({
                            top: 0,
                            behavior:
                                "smooth"
                        });

                        return;
                    }

                    const navbar =
                        document.querySelector(
                            ".navbar"
                        );

                    const offset =
                        navbar
                            ? navbar
                                  .getBoundingClientRect()
                                  .height +
                              26
                            : 110;

                    const top =
                        target
                            .getBoundingClientRect()
                            .top +
                        window.scrollY -
                        offset;

                    window.scrollTo({
                        top:
                            Math.max(
                                0,
                                top
                            ),
                        behavior:
                            "smooth"
                    });
                }
            );
        }
    );

    window.addEventListener(
        "scroll",
        updateFromScroll,
        {
            passive: true
        }
    );

    window.addEventListener(
        "resize",
        updateFromScroll,
        {
            passive: true
        }
    );

    setActive(
        getCurrentSection()
    );

    setTimeout(
        updateFromScroll,
        150
    );
}

function setupFAQ() {
    $$(".faq-item").forEach(
        item => {
            const button =
                $("button", item);

            const answer =
                $(".faq-answer", item);

            if (
                !button ||
                !answer
            ) {
                return;
            }

            button.addEventListener(
                "click",
                () => {
                    const open =
                        !item.classList.contains(
                            "open"
                        );

                    $$(".faq-item.open")
                        .forEach(
                            other => {
                                other.classList.remove(
                                    "open"
                                );

                                $(
                                    ".faq-answer",
                                    other
                                )
                                    ?.style
                                    .removeProperty(
                                        "max-height"
                                    );
                            }
                        );

                    item.classList.toggle(
                        "open",
                        open
                    );

                    answer.style.maxHeight =
                        open
                            ? `${answer.scrollHeight}px`
                            : null;
                }
            );
        }
    );
}

function setupScrollReveal() {
    const elements =
        $$(
            ".reveal-on-scroll, .product-card, .showcase-card, .compatibility-card, .process-item, .feature-item, .service-row"
        );

    elements.forEach(
        element => {
            element.classList.add(
                "is-visible"
            );
        }
    );
}

function setupProductHover() {
    $$(
        ".product-card, .showcase-card, .compatibility-card"
    ).forEach(
        card => {
            card.addEventListener(
                "pointermove",
                event => {
                    const rect =
                        card.getBoundingClientRect();

                    if (
                        !rect.width ||
                        !rect.height
                    ) {
                        return;
                    }

                    const x =
                        (
                            (
                                event.clientX -
                                rect.left
                            ) /
                            rect.width
                        ) *
                        100;

                    const y =
                        (
                            (
                                event.clientY -
                                rect.top
                            ) /
                            rect.height
                        ) *
                        100;

                    card.style.setProperty(
                        "--mouse-x",
                        `${x}%`
                    );

                    card.style.setProperty(
                        "--mouse-y",
                        `${y}%`
                    );
                }
            );

            card.addEventListener(
                "pointerleave",
                () => {
                    card.style.setProperty(
                        "--mouse-x",
                        "50%"
                    );

                    card.style.setProperty(
                        "--mouse-y",
                        "50%"
                    );
                }
            );
        }
    );
}

function setupProductModals() {
    const cards =
        $$(".product-modal-trigger, .product-card");

    const modal =
        $("#productModal");

    if (
        !modal ||
        !cards.length
    ) {
        return;
    }

    const modalImage =
        $("#productModalImage");

    const modalName =
        $("#productModalName") ||
        $("#productModalTitle");

    const modalCategory =
        $("#productModalCategory");

    const modalPrice =
        $("#productModalPrice");

    const modalDescription =
        $("#productModalDescription");

    const modalFeatures =
        $("#productModalFeatures");

    const modalStatus =
        $("#productModalStatus");

    const modalClose =
        $("#productModalClose") ||
        $(".product-modal-close", modal);

    const modalDiscord =
        $("#productModalDiscord");

    const cartButton =
        $("#productModalAddCart") ||
        $("#productModalCart") ||
        $(".product-modal-cart", modal);

    let lastCard = null;

    let activeProduct = null;

    function closeProductModal() {
        modal.classList.remove(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "product-modal-open"
        );

        lastCard?.focus?.();

        lastCard = null;
        activeProduct = null;
    }

    function parseFeatures(card) {
        let features = [];

        const raw =
            card.dataset.features;

        if (raw) {
            try {
                features =
                    JSON.parse(raw);
            } catch {
                features =
                    raw
                        .split("|")
                        .map(
                            feature =>
                                feature.trim()
                        )
                        .filter(
                            Boolean
                        );
            }
        }

        if (
            !Array.isArray(
                features
            ) ||
            !features.length
        ) {
            features = [
                "Clean and modern interface",
                "Optimized FiveM resource",
                "Easy configuration",
                "Built for modern frameworks"
            ];
        }

        return features;
    }

    function openProductModal(card) {
        lastCard =
            card;

        activeProduct =
            getProductData(card);

        if (!activeProduct) {
            return;
        }

        const name =
            activeProduct.name ||
            "DFS Resource";

        const price =
            activeProduct.price;

        const category =
            activeProduct.category ||
            "RESOURCE";

        const description =
            activeProduct.description ||
            "A professionally developed FiveM resource designed for modern servers.";

        const image =
            activeProduct.image ||
            "/images/logo.png";

        const features =
            parseFeatures(card);

        if (modalImage) {
            modalImage.src =
                image;

            modalImage.onerror =
                () => {
                    modalImage.onerror =
                        null;

                    modalImage.src =
                        "/images/logo.png";
                };
        }

        if (modalName) {
            modalName.textContent =
                name;
        }

        if (modalCategory) {
            modalCategory.textContent =
                category;
        }

        if (modalPrice) {
            const numericPrice =
                Number.parseFloat(
                    price
                );

            modalPrice.textContent =
                Number.isFinite(
                    numericPrice
                )
                    ? `€${numericPrice.toFixed(2)}`
                    : "PRICE TBA";
        }

        if (modalDescription) {
            modalDescription.textContent =
                description;
        }

        if (modalFeatures) {
            modalFeatures.innerHTML =
                features
                    .map(
                        feature => `
                            <li>
                                <span>✓</span>

                                <strong>
                                    ${escapeHtml(
                                        feature
                                    )}
                                </strong>
                            </li>
                        `
                    )
                    .join("");
        }

        if (modalStatus) {
            modalStatus.textContent =
                Number.isFinite(
                    Number(price)
                )
                    ? "AVAILABLE"
                    : "SOON";
        }

        if (modalDiscord) {
            modalDiscord.href =
                "https://discord.gg/dfscripts";

            modalDiscord.target =
                "_blank";

            modalDiscord.rel =
                "noopener noreferrer";
        }

        if (cartButton) {
            const available =
                Number.isFinite(
                    Number(price)
                );

            cartButton.style.display =
                available
                    ? ""
                    : "none";
        }

        modal.classList.add(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "product-modal-open"
        );
    }

    cards.forEach(
        card => {
            if (
                card.dataset.modalReady ===
                "true"
            ) {
                return;
            }

            card.dataset.modalReady =
                "true";

            card.setAttribute(
                "tabindex",
                "0"
            );

            card.setAttribute(
                "role",
                "button"
            );

            card.addEventListener(
                "click",
                event => {
                    if (
                        event.target.closest(
                            "a, button"
                        )
                    ) {
                        return;
                    }

                    event.preventDefault();

                    openProductModal(
                        card
                    );
                }
            );

            card.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key !==
                            "Enter" &&
                        event.key !==
                            " "
                    ) {
                        return;
                    }

                    event.preventDefault();

                    openProductModal(
                        card
                    );
                }
            );

            card.style.cursor =
                "pointer";
        }
    );

    modalClose?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            closeProductModal();
        }
    );

    modal.addEventListener(
        "click",
        event => {
            const windowElement =
                event.target.closest(
                    ".product-modal-window"
                );

            if (
                event.target ===
                    modal ||
                !windowElement
            ) {
                closeProductModal();
            }
        }
    );

    modalDiscord?.addEventListener(
        "click",
        event => {
            event.stopPropagation();
        }
    );

    cartButton?.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            if (
                !activeProduct ||
                activeProduct.price ==
                    null
            ) {
                return;
            }

            addToCart(
                activeProduct
            );

            closeProductModal();
        }
    );

    modal._close =
        closeProductModal;
}


/* Product modal fixes: keep the original modal implementation above intact,
   but use this hardened version during init so existing site functionality stays untouched. */
function setupProductClickFallback() {
    if (document.body.dataset.productClickFallbackReady === "true") return;
    document.body.dataset.productClickFallbackReady = "true";

    document.addEventListener("click", event => {
        const card = event.target.closest?.(".product-card, .product-modal-trigger");
        if (!card) return;

        if (card.dataset.productFallbackOpening === "true") return;

        if (event.target.closest("a, button, input, select, textarea")) return;

        const modal = document.getElementById("productModal");
        if (!modal) return;

        event.preventDefault();
        event.stopPropagation();

        const cards = document.querySelectorAll(".product-card, .product-modal-trigger");
        const index = Array.from(cards).indexOf(card);
        const trigger = card;

        if (typeof trigger.click === "function" && !card.dataset.productFallbackOpening) {
            card.dataset.productFallbackOpening = "true";
            setTimeout(() => {
                delete card.dataset.productFallbackOpening;
                if (!modal.classList.contains("open")) {
                    trigger.dispatchEvent(new MouseEvent("click", {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                }
            }, 0);
        }
    }, true);
}

function setupProductModalsFixed() {
    const cards = $$(".product-modal-trigger, .product-card");
    const modal = $("#productModal");

    if (!modal || !cards.length) return;

    const image = $("#productModalImage");
    const nameEl = $("#productModalName") || $("#productModalTitle");
    const categoryEl = $("#productModalCategory");
    const priceEl = $("#productModalPrice");
    const descriptionEl = $("#productModalDescription");
    const featuresEl = $("#productModalFeatures");
    const statusEl = $("#productModalAvailability") || $("#productModalStatus");
    const closeEl = $("#productModalClose") || $(".product-modal-close", modal);
    const discordEl = $("#productModalDiscord");
    const cartEl = $("#productModalAddCart") || $("#productModalCart") || $(".product-modal-cart", modal);

    let activeProduct = null;
    let lastCard = null;

    const overrides = {
        "banking system": { price: 15, available: false, image: "/images/logo.png" },
        "hud, car hud": { price: 6, available: true, image: "/images/hud.png" },
        "hud": { price: 6, available: true, image: "/images/hud.png" },
        "car hud": { price: 6, available: true, image: "/images/hud.png" },
        "multicharacter + identity": {
            price: 6,
            available: true,
            image: "/images/multichar.png",
            gallery: ["/images/multichar.png", "/images/multichar-identity.png"]
        }
    };

    const normalize = value => String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    function cardName(card) {
        const dataName = card?.dataset?.name || card?.dataset?.product || card?.getAttribute("data-item");
        if (dataName) return dataName.trim();
        return $("h1, h2, h3, h4, strong, b", card)?.textContent
            ?.replace(/\s+/g, " ")
            ?.trim() || "DFS Resource";
    }

    function getOverride(productName) {
        const n = normalize(productName);
        if (overrides[n]) return overrides[n];
        if (n.includes("multicharacter") && n.includes("identity")) return overrides["multicharacter + identity"];
        if (n.includes("banking") && n.includes("system")) return overrides["banking system"];
        if (n === "hud" || n.includes("car hud")) return overrides["car hud"];
        return null;
    }

    function productFromCard(card) {
        const base = getProductData(card) || {};
        const productName = cardName(card);
        const override = getOverride(productName);
        const product = {
            ...base,
            name: productName,
            id: base.id || normalize(productName).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
            price: base.price ?? null,
            priceLabel: base.priceLabel || "",
            image: base.image || "/images/logo.png",
            category: base.category || "RESOURCE",
            description: base.description || "",
            features: base.features || ""
        };

        if (override) {
            Object.assign(product, override);
            product.priceLabel = `€${override.price.toFixed(2)}`;
        }

        const rawGallery = card.dataset.gallery || card.getAttribute("data-gallery");
        if (rawGallery) {
            try {
                const parsed = JSON.parse(rawGallery);
                if (Array.isArray(parsed) && parsed.length) product.gallery = parsed;
            } catch {
                const parsed = rawGallery.split("|").map(v => v.trim()).filter(Boolean);
                if (parsed.length) product.gallery = parsed;
            }
        }

        const explicitStatus = normalize(card.querySelector(".product-topline b")?.textContent || "");
        const isSoonCard = card.classList.contains("soon-product") || explicitStatus === "soon" || explicitStatus.includes("coming soon") || explicitStatus.includes("unavailable");
        if (isSoonCard && !override) product.available = false;
        if (product.available !== true && product.available !== false) {
            product.available = Number.isFinite(Number(product.price)) && !isSoonCard;
        }

        if (product.id === "hud" || normalize(product.name) === "hud, car hud") {
            product.image = "/images/hud.png";
        }
        if (normalize(product.name).includes("multicharacter") && normalize(product.name).includes("identity")) {
            product.image = "/images/multichar.png";
            product.gallery = ["/images/multichar.png", "/images/multichar-identity.png"];
        }

        return product;
    }

    function parseFeatures(card) {
        let features = [];
        const raw = card.dataset.features;
        if (raw) {
            try { features = JSON.parse(raw); }
            catch { features = raw.split("|").map(v => v.trim()).filter(Boolean); }
        }
        return Array.isArray(features) && features.length ? features : [
            "Clean and modern interface",
            "Optimized FiveM resource",
            "Easy configuration",
            "Built for modern frameworks"
        ];
    }

    function addStyles() {
        if (document.getElementById("dfsProductModalFixStyles")) return;
        const style = document.createElement("style");
        style.id = "dfsProductModalFixStyles";
        style.textContent = `
            .product-modal-soon{display:none!important}
            .product-modal-hero{position:relative;overflow:hidden}
            .product-modal-image{position:relative;z-index:2;display:block;width:min(78%,760px);height:230px;object-fit:contain;filter:drop-shadow(0 24px 45px rgba(0,0,0,.62));border-radius:12px}
            .dfs-product-gallery{position:absolute;left:24px;right:24px;bottom:16px;z-index:5;display:flex;justify-content:center;pointer-events:none}
            .dfs-product-thumbs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;pointer-events:auto;padding:5px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(8,8,9,.72);backdrop-filter:blur(12px);box-shadow:0 12px 35px rgba(0,0,0,.42)}
            .dfs-product-thumb{width:78px;height:50px;padding:0;border:1px solid #303034;border-radius:8px;background:#101012;overflow:hidden;cursor:pointer;opacity:.58;transition:transform .18s ease,opacity .18s ease,border-color .18s ease,box-shadow .18s ease}
            .dfs-product-thumb:hover{opacity:.92;transform:translateY(-2px);border-color:#666}
            .dfs-product-thumb.active{opacity:1;border-color:#aaa;box-shadow:0 0 0 2px rgba(255,255,255,.08)}
            .dfs-product-thumb img{width:100%;height:100%;object-fit:cover;display:block}
            .product-modal-status-unavailable{color:#777!important}
            .product-modal-status-unavailable i{background:#555!important;box-shadow:0 0 0 4px rgba(255,255,255,.015)!important}
            .product-modal-status-available{color:#e8e8e8!important}
            .product-modal-status-available i{background:#d7d7d7!important;box-shadow:0 0 0 4px rgba(255,255,255,.035)!important}
            .product-modal-cart:disabled{display:none!important}
            .product-modal-trigger.available-product:hover{border-color:#454545}
            .compact-product-grid .available-product .product-topline b{color:#d7d7d7}
            .compact-product-grid .soon-product .product-topline b{color:#666}
            .compact-product-grid .product-preview-image{overflow:hidden}
            .compact-product-grid .product-preview-image img{width:100%;height:100%;object-fit:cover;display:block}
            .compact-product-grid .multichar-preview{overflow:hidden}
            .compact-product-grid .multichar-preview .product-preview-gallery{display:grid;grid-template-columns:1fr 1fr;width:100%;height:100%;gap:3px}
            .compact-product-grid .multichar-preview .product-preview-shot{min-width:0;overflow:hidden}
            .compact-product-grid .multichar-preview img{width:100%;height:100%;object-fit:cover;display:block}
            @media(max-width:700px){
                .product-modal-image{width:92%;height:185px}
                .dfs-product-gallery{left:12px;right:12px;bottom:10px}
                .dfs-product-thumb{width:62px;height:42px}
            }
        `;
        document.head.appendChild(style);
    }

    function renderGallery(product) {
        modal.querySelector(".dfs-product-gallery")?.remove();
        const gallery = Array.isArray(product.gallery) ? product.gallery.filter(Boolean) : [];
        if (!image || gallery.length < 2) return;
        addStyles();

        const host = document.createElement("div");
        host.className = "dfs-product-gallery";
        const bar = document.createElement("div");
        bar.className = "dfs-product-gallery-bar";

        const label = document.createElement("span");
        label.className = "dfs-product-gallery-label";
        label.textContent = "PREVIEW";

        const counter = document.createElement("span");
        counter.className = "dfs-product-gallery-counter";
        counter.textContent = `01 / ${String(gallery.length).padStart(2, "0")}`;

        const thumbs = document.createElement("div");
        thumbs.className = "dfs-product-thumbs";

        gallery.forEach((src, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "dfs-product-thumb" + (index === 0 ? " active" : "");
            button.setAttribute("aria-label", `Show image ${index + 1}`);
            const thumb = document.createElement("img");
            thumb.src = src;
            thumb.alt = "";
            thumb.onerror = () => button.remove();
            button.appendChild(thumb);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                image.src = src;
                image.onerror = null;
                thumbs.querySelectorAll(".dfs-product-thumb").forEach(el => el.classList.toggle("active", el === button));
                counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(gallery.length).padStart(2, "0")}`;
            });
            thumbs.appendChild(button);
        });

        bar.append(label, thumbs, counter);
        host.appendChild(bar);
        image.parentElement?.insertAdjacentElement("afterend", host) || modal.appendChild(host);
    }

    function closeModal() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("product-modal-open");
        lastCard?.focus?.();
        lastCard = null;
        activeProduct = null;
    }

    function openModal(card) {
        lastCard = card;
        activeProduct = productFromCard(card);
        const product = activeProduct;
        const available = product.available === true;

        if (image) {
            image.src = product.image || "/images/logo.png";
            image.onerror = () => { image.onerror = null; image.src = "/images/logo.png"; };
        }
        renderGallery(product);
        if (nameEl) nameEl.textContent = product.name || "DFS Resource";
        if (categoryEl) categoryEl.textContent = product.category || "RESOURCE";
        if (priceEl) {
            const price = Number.parseFloat(product.price);
            priceEl.textContent = Number.isFinite(price) ? `€${price.toFixed(2)}` : "PRICE TBA";
        }
        if (descriptionEl) descriptionEl.textContent = product.description || "A professionally developed FiveM resource designed for modern servers.";
        if (featuresEl) {
            featuresEl.innerHTML = parseFeatures(card).map(feature => `
                <li><span>✓</span><strong>${escapeHtml(feature)}</strong></li>
            `).join("");
        }
        if (statusEl) {
            statusEl.textContent = available ? "AVAILABLE" : (normalize(product.name) === "banking system" ? "UNAVAILABLE" : "COMING SOON");
            statusEl.classList.remove("product-modal-status-unavailable", "product-modal-status-available");
            statusEl.classList.add(available ? "product-modal-status-available" : "product-modal-status-unavailable");
        }
        const codeEl = $("#productModalCode");
        if (codeEl) codeEl.textContent = product.id ? String(product.id).toUpperCase().replace(/-/g, " / ") : "RESOURCE";
        if (discordEl) {
            discordEl.href = "https://discord.gg/dfscripts";
            discordEl.target = "_blank";
            discordEl.rel = "noopener noreferrer";
        }
        if (cartEl) {
            cartEl.disabled = !available;
            cartEl.setAttribute("aria-disabled", String(!available));
            cartEl.style.display = available ? "" : "none";
        }

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("product-modal-open");
    }

    cards.forEach(card => {
        if (card.dataset.productModalFixReady === "true") return;
        card.dataset.productModalFixReady = "true";
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.style.cursor = "pointer";
        card.addEventListener("click", event => {
            if (event.target.closest("a, button")) return;
            event.preventDefault();
            openModal(card);
        });
        card.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openModal(card);
        });
    });

    closeEl?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeModal();
    });

    modal.addEventListener("click", event => {
        if (event.target === modal || !event.target.closest(".product-modal-window")) closeModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("open")) {
            event.preventDefault();
            closeModal();
        }
    });

    discordEl?.addEventListener("click", event => event.stopPropagation());

    cartEl?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (!activeProduct?.available || !Number.isFinite(Number(activeProduct.price))) return;
        addToCart(activeProduct);
        closeModal();
    });

    addStyles();
    modal._close = closeModal;
}

function setupKeyboardShortcuts() {
    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

            closeCart();

            const signin =
                $("#signinPop");

            const discount =
                $("#discountPop");

            if (
                signin &&
                !signin.classList.contains(
                    "popup-hidden"
                )
            ) {
                hidePopup(
                    signin,
                    DISCORD_POPUP_KEY
                );
            }

            if (
                discount &&
                !discount.classList.contains(
                    "popup-hidden"
                )
            ) {
                hidePopup(
                    discount,
                    OFFER_POPUP_KEY
                );
            }

            refreshAuthElements();

            if (discordProfile) {
                $(
                    ".user-dropdown",
                    discordProfile
                )?.classList.remove(
                    "open"
                );

                discordProfile.classList.remove(
                    "profile-open"
                );

                $(
                    "#profileToggle",
                    discordProfile
                )?.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

            searchOverlay?._close?.();

            const productModal =
                $("#productModal");

            if (
                productModal?.classList.contains(
                    "open"
                )
            ) {
                productModal._close?.();
            }
        }
    );
}

function handleDiscordError() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const error =
        params.get(
            "discord_error"
        );

    if (!error) {
        return;
    }

    const messages = {
        invalid_state:
            "Discord login session expired. Please try again.",

        not_configured:
            "Discord login is not configured.",

        not_member:
            "You must be a member of the DFScripts Discord server.",

        oauth:
            "Discord login failed. Please try again."
    };

    showToast(
        messages[error] ||
        "Discord login failed."
    );

    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );
}

function addDynamicStyles() {
    if (
        $("#dfscriptsDynamicStyles")
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "dfscriptsDynamicStyles";

    style.textContent = `
        .reveal-on-scroll,
        .product-card,
        .showcase-card,
        .compatibility-card,
        .process-item,
        .feature-item,
        .service-row {
            opacity: 1 !important;
            transform: none !important;
        }

        .search-overlay {
            display: flex !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 99999 !important;
            align-items: flex-start;
            justify-content: center;
            padding: 110px 20px 30px;
            background: rgba(0,0,0,.78);
            backdrop-filter: blur(12px);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition:
                opacity .2s ease,
                visibility .2s ease;
        }

        .search-overlay.open {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }

        .search-modal {
            width: min(720px,100%);
            border: 1px solid #303030;
            border-radius: 18px;
            background: #090909;
            box-shadow:
                0 35px 120px rgba(0,0,0,.9);
            overflow: hidden;
        }

        .search-modal-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 22px;
            border-bottom: 1px solid #202020;
        }

        .search-modal-top div {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .search-modal-top span {
            color: #666;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: .16em;
        }

        .search-modal-top strong {
            font-size: 18px;
        }

        .search-close {
            width: 34px;
            height: 34px;
            border: 1px solid #292929;
            border-radius: 8px;
            background: #111;
            color: #777;
            font-size: 18px;
            cursor: pointer;
        }

        .search-field {
            margin: 16px;
            padding: 0 13px;
            height: 52px;
            border: 1px solid #2a2a2a;
            border-radius: 10px;
            background: #101010;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .search-field i {
            color: #777;
        }

        .search-field input {
            flex: 1;
            min-width: 0;
            border: 0;
            outline: 0;
            background: none;
            color: #fff;
            font: inherit;
        }

        .search-field input::placeholder {
            color: #555;
        }

        .search-field kbd {
            padding: 5px 7px;
            border: 1px solid #292929;
            border-radius: 5px;
            background: #151515;
            color: #666;
            font-size: 7px;
        }

        .search-results {
            max-height: 420px;
            overflow: auto;
            padding: 0 16px 16px;
            scrollbar-width: thin;
            scrollbar-color:
                #454545
                #090909;
        }

        .search-results::-webkit-scrollbar {
            width: 8px;
        }

        .search-results::-webkit-scrollbar-track {
            background: #090909;
        }

        .search-results::-webkit-scrollbar-thumb {
            background:
                linear-gradient(
                    180deg,
                    #484848,
                    #242424
                );
            border: 2px solid #090909;
            border-radius: 999px;
        }

        .search-result {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 13px;
            border: 1px solid transparent;
            border-radius: 10px;
            background: transparent;
            color: #fff;
            text-align: left;
            cursor: pointer;
            transition:
                background .18s ease,
                border-color .18s ease,
                transform .18s ease;
        }

        .search-result:hover {
            background: #111;
            border-color: #292929;
            transform: translateX(3px);
        }

        .search-result-number {
            width: 28px;
            color: #555;
            font-size: 8px;
            font-weight: 900;
        }

        .search-result-copy {
            display: flex;
            flex-direction: column;
            gap: 5px;
            flex: 1;
            min-width: 0;
        }

        .search-result-copy strong {
            font-size: 11px;
        }

        .search-result-copy small {
            color: #555;
            font-size: 7px;
        }

        .search-result > i {
            color: #555;
        }

        .search-empty {
            min-height: 110px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            color: #555;
            font-size: 9px;
            text-align: center;
        }

        .search-highlight {
            animation:
                dfsSearchHighlight
                1.3s ease;
        }

        @keyframes dfsSearchHighlight {
            0% {
                box-shadow:
                    0 0 0 0
                    rgba(255,255,255,0);
            }

            35% {
                box-shadow:
                    0 0 0 5px
                    rgba(255,255,255,.08);
            }

            100% {
                box-shadow:
                    0 0 0 0
                    rgba(255,255,255,0);
            }
        }

        .popup-hidden {
            display: none !important;
        }

        .cart-pulse {
            animation:
                dfsCartPulse
                .35s ease;
        }

        @keyframes dfsCartPulse {
            0% {
                transform: scale(1);
            }

            45% {
                transform: scale(1.18);
            }

            100% {
                transform: scale(1);
            }
        }

        .dfs-account-panel {
            width: 100%;
            box-sizing: border-box;
            padding: 14px;
            background:
                linear-gradient(
                    145deg,
                    #111 0%,
                    #0b0b0b 100%
                );
            border: 1px solid #252525;
            border-radius: 12px;
            color: #fff;
        }

        .dfs-account-head {
            display: flex;
            align-items: center;
            gap: 11px;
        }

        .dfs-account-avatar-wrap {
            position: relative;
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
        }

        .dfs-account-avatar {
            width: 42px;
            height: 42px;
            display: block;
            object-fit: cover;
            border-radius: 10px;
            border: 1px solid #303030;
            background: #151515;
        }

        .dfs-account-online {
            position: absolute;
            right: -2px;
            bottom: -2px;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #6dff9a;
            border: 2px solid #0b0b0b;
            box-sizing: content-box;
        }

        .dfs-account-identity {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .dfs-account-identity strong {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
            line-height: 1.1;
        }

        .dfs-account-identity span {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #777;
            font-size: 8px;
            font-weight: 800;
        }

        .dfs-account-identity span i {
            font-size: 7px;
        }

        .dfs-account-divider {
            width: 100%;
            height: 1px;
            background: #202020;
            margin: 12px 0;
        }

        .dfs-account-label {
            color: #555;
            font-size: 7px;
            font-weight: 900;
            letter-spacing: .13em;
            margin-bottom: 8px;
        }

        .dfs-account-stats {
            display: grid;
            grid-template-columns:
                repeat(3, 1fr);
            gap: 6px;
        }

        .dfs-account-stat {
            min-width: 0;
            padding: 8px 6px;
            border: 1px solid #202020;
            border-radius: 7px;
            background: #0d0d0d;
            text-align: center;
        }

        .dfs-account-stat strong {
            display: block;
            color: #eee;
            font-size: 10px;
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .dfs-account-stat span {
            display: block;
            margin-top: 4px;
            color: #555;
            font-size: 6px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .05em;
        }

        .dfs-account-role {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 9px;
            border: 1px solid #252525;
            border-radius: 8px;
            background: #101010;
            margin-top: 10px;
        }

        .dfs-account-role-icon {
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            flex: 0 0 28px;
            border-radius: 7px;
            background: #191919;
            color: #aaa;
            font-size: 9px;
        }

        .dfs-account-role > div:last-child {
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 0;
        }

        .dfs-account-role small {
            color: #555;
            font-size: 6px;
            font-weight: 900;
            letter-spacing: .08em;
        }

        .dfs-account-role strong {
            color: #ddd;
            font-size: 9px;
        }

        .dfs-account-actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .dfs-account-action {
            width: 100%;
            min-height: 42px;
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 7px;
            border: 1px solid transparent;
            border-radius: 8px;
            background: transparent;
            color: #fff;
            text-align: left;
            cursor: pointer;
            transition:
                background .18s ease,
                border-color .18s ease;
        }

        .dfs-account-action:hover {
            background: #151515;
            border-color: #242424;
        }

        .dfs-account-action > span {
            width: 27px;
            height: 27px;
            display: grid;
            place-items: center;
            flex: 0 0 27px;
            border-radius: 7px;
            background: #151515;
            color: #777;
            font-size: 8px;
        }

        .dfs-account-action > div {
            display: flex;
            flex-direction: column;
            gap: 3px;
            flex: 1;
            min-width: 0;
        }

        .dfs-account-action strong {
            font-size: 8px;
        }

        .dfs-account-action small {
            color: #555;
            font-size: 6px;
        }

        .dfs-account-action > i {
            color: #444;
            font-size: 7px;
        }

        .dfs-account-logout {
            width: 100%;
            min-height: 34px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 7px 8px;
            border: 1px solid transparent;
            border-radius: 7px;
            background: transparent;
            color: #777;
            cursor: pointer;
            text-align: left;
            transition:
                background .18s ease,
                color .18s ease,
                border-color .18s ease;
        }

        .dfs-account-logout:hover {
            color: #fff;
            background: #151515;
            border-color: #292929;
        }

        .dfs-account-logout span {
            width: 24px;
            height: 24px;
            display: grid;
            place-items: center;
            border-radius: 6px;
            background: #141414;
            font-size: 8px;
        }

        .dfs-account-logout strong {
            font-size: 8px;
        }

        .user-dropdown.dfs-account-enhanced {
            min-width: 280px;
            padding: 0 !important;
        }

        @media (max-width: 700px) {
            .search-overlay {
                padding:
                    80px 10px 20px;
            }

            .search-modal {
                border-radius: 14px;
            }

            .search-modal-top {
                padding: 17px;
            }

            .search-field {
                margin: 12px;
            }

            .search-results {
                max-height: 55vh;
            }

            .user-dropdown.dfs-account-enhanced {
                min-width:
                    min(
                        280px,
                        calc(100vw - 24px)
                    );
            }

            .dfs-account-stats {
                gap: 4px;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}

function mountBankingDemo() {
    const host =
        $("#bankingDemoHost");

    if (
        !host ||
        host.dataset.mounted ===
            "true"
    ) {
        return;
    }

    const root =
        host.attachShadow
            ? host.attachShadow({
                  mode: "open"
              })
            : host;

    root.innerHTML = `
        <style>
            :host {
                display:block;
                width:100%;
                height:100%;
            }

            * {
                box-sizing:border-box;
            }

            .bank {
                width:100%;
                height:100%;
                min-height:640px;
                display:grid;
                grid-template-columns:225px 1fr;
                background:#09080d;
                color:#eee;
                font-family:Inter,system-ui,sans-serif;
                overflow:hidden;
            }

            .side {
                background:#0d0b12;
                border-right:1px solid #28222d;
                padding:28px 16px 18px;
                display:flex;
                flex-direction:column;
            }

            .side-brand {
                padding:0 10px 28px;
            }

            .side-brand strong {
                display:block;
                font-size:17px;
                letter-spacing:.06em;
            }

            .side-brand small {
                color:#777;
                font-size:7px;
                letter-spacing:.2em;
                font-weight:800;
            }

            .label {
                color:#69616d;
                font-size:7px;
                font-weight:900;
                letter-spacing:.18em;
                margin:0 10px 10px;
            }

            .nav {
                display:grid;
                gap:5px;
            }

            .nav button {
                border:0;
                background:transparent;
                color:#817985;
                border-radius:8px;
                padding:12px 11px;
                text-align:left;
                font:800 9px Inter,system-ui,sans-serif;
                cursor:pointer;
            }

            .nav button i {
                width:18px;
                margin-right:5px;
                text-align:center;
            }

            .nav button:hover,
            .nav button.active {
                background:#f0edf1;
                color:#19151d;
            }

            .side-bottom {
                margin-top:auto;
                display:grid;
                gap:8px;
            }

            .side-card {
                border:1px solid #29242e;
                background:#111016;
                border-radius:8px;
                padding:11px;
                color:#8b8490;
                font-size:7px;
            }

            .side-card strong {
                display:block;
                color:#ddd;
                font-size:8px;
                margin-bottom:4px;
            }

            .main {
                min-width:0;
                display:flex;
                flex-direction:column;
                background:
                    linear-gradient(
                        180deg,
                        #0a090e,
                        #09080d
                    );
            }

            .topbar {
                height:72px;
                border-bottom:1px solid #24202a;
                display:flex;
                align-items:center;
                justify-content:space-between;
                padding:0 28px;
            }

            .account-select {
                border:1px solid #28232e;
                background:#0e0c12;
                border-radius:8px;
                padding:9px 13px;
                color:#eee;
                font-size:8px;
            }

            .account-select small {
                display:block;
                color:#6d6570;
                font-size:6px;
                margin-top:3px;
            }

            .balance-box {
                text-align:right;
            }

            .balance-box small {
                display:block;
                color:#6f6872;
                font-size:6px;
                font-weight:900;
                letter-spacing:.12em;
            }

            .balance-box strong {
                display:block;
                margin-top:4px;
                font-size:14px;
            }

            .balance-box span {
                color:#ad5b88;
                font-size:6px;
                font-weight:800;
            }

            .content {
                padding:26px 28px 30px;
                overflow:auto;
            }

            .welcome {
                color:#77717b;
                font-size:8px;
                margin-bottom:17px;
            }

            .welcome b {
                color:#eee;
            }

            .stats {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
            }

            .stat {
                min-height:105px;
                border:1px solid #29242e;
                border-radius:11px;
                background:#0e0c12;
                padding:18px;
                position:relative;
            }

            .stat small {
                color:#69626c;
                font-size:6px;
                font-weight:900;
                letter-spacing:.14em;
            }

            .stat strong {
                display:block;
                margin-top:16px;
                font-size:20px;
                letter-spacing:-.04em;
            }

            .stat-icon {
                position:absolute;
                right:15px;
                top:15px;
                width:28px;
                height:28px;
                border-radius:7px;
                display:grid;
                place-items:center;
                background:#261221;
                color:#a84e80;
                font-size:8px;
            }

            .middle {
                display:grid;
                grid-template-columns:
                    minmax(0,1.7fr)
                    minmax(260px,.9fr);
                gap:10px;
                margin-top:10px;
            }

            .panel {
                border:1px solid #29242e;
                border-radius:11px;
                background:#0e0c12;
                padding:17px;
            }

            .panel-head {
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
            }

            .panel h2 {
                margin:0;
                font-size:10px;
            }

            .panel p {
                margin:5px 0 0;
                color:#615a65;
                font-size:6px;
            }

            .chart-value {
                border-radius:6px;
                background:#291221;
                color:#b25a89;
                padding:6px 8px;
                font-size:6px;
                font-weight:900;
            }

            .chart {
                height:145px;
                margin-top:10px;
                position:relative;
                overflow:hidden;
                border-top:1px solid #1c1820;
                background:
                    repeating-linear-gradient(
                        to bottom,
                        transparent 0,
                        transparent 35px,
                        #19161c 36px
                    );
            }

            .chart svg {
                width:100%;
                height:100%;
                display:block;
            }

            .actions {
                display:grid;
                gap:8px;
                margin-top:15px;
            }

            .quick {
                border:1px solid #29242e;
                background:#111016;
                border-radius:8px;
                color:#aaa2ad;
                padding:11px;
                text-align:left;
                font-size:7px;
                cursor:pointer;
            }

            .quick:hover {
                border-color:#4a3444;
                color:#fff;
            }

            .transfer {
                margin-top:8px;
                width:100%;
                border:0;
                border-radius:8px;
                background:#8d3d67;
                color:#fff;
                padding:12px;
                font:900 7px Inter,system-ui,sans-serif;
                cursor:pointer;
            }

            .transfer:hover {
                background:#a84b7b;
            }

            .transactions {
                margin-top:10px;
            }

            .tx {
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:12px 10px;
                border-top:1px solid #1e1a22;
            }

            .tx-left {
                display:flex;
                align-items:center;
                gap:10px;
            }

            .tx-icon {
                width:28px;
                height:28px;
                display:grid;
                place-items:center;
                border-radius:7px;
                background:#21131f;
                color:#9f4e7b;
                font-size:7px;
            }

            .tx b {
                font-size:8px;
            }

            .tx small {
                display:block;
                color:#5f5863;
                font-size:6px;
                margin-top:3px;
            }

            .plus {
                color:#82ba8e;
            }

            .minus {
                color:#c47883;
            }

            .view {
                display:none;
            }

            .view.active {
                display:block;
            }

            .form {
                max-width:500px;
                margin-top:20px;
                border:1px solid #29242e;
                border-radius:11px;
                padding:18px;
                background:#0e0c12;
            }

            .form label {
                display:block;
                color:#6b6470;
                font-size:6px;
                font-weight:900;
                letter-spacing:.12em;
                margin:0 0 7px;
            }

            .form input {
                width:100%;
                margin-bottom:13px;
                border:1px solid #29242e;
                background:#09080d;
                color:#fff;
                border-radius:7px;
                padding:11px;
                outline:none;
                font-size:8px;
            }

            .form input:focus {
                border-color:#75405e;
            }

            .submit {
                width:100%;
                border:0;
                border-radius:7px;
                padding:12px;
                background:#8d3d67;
                color:#fff;
                font:900 7px Inter,system-ui,sans-serif;
                cursor:pointer;
            }

            .notice {
                margin-top:12px;
                color:#69616d;
                font-size:7px;
                line-height:1.6;
            }

            .toast {
                position:fixed;
                left:50%;
                bottom:22px;
                transform:
                    translate(
                        -50%,
                        20px
                    );
                opacity:0;
                pointer-events:none;
                padding:10px 14px;
                border:1px solid #3a3040;
                border-radius:8px;
                background:#151118;
                color:#eee;
                font-size:7px;
                transition:.18s;
                z-index:20;
            }

            .toast.show {
                opacity:1;
                transform:
                    translate(
                        -50%,
                        0
                    );
            }

            @media(max-width:800px) {
                .bank {
                    grid-template-columns:1fr;
                }

                .side {
                    display:none;
                }

                .content {
                    padding:20px;
                }

                .stats,
                .middle {
                    grid-template-columns:1fr;
                }

                .topbar {
                    padding:0 18px;
                }

                .stat {
                    min-height:90px;
                }
            }
        </style>

        <div class="bank">

            <aside class="side">

                <div class="side-brand">
                    <strong>
                        DFScripts
                    </strong>

                    <small>
                        BANKING SYSTEM
                    </small>
                </div>

                <div class="label">
                    NAVIGACE
                </div>

                <nav class="nav">

                    <button
                        class="active"
                        data-view="overview"
                    >
                        <i class="fa-solid fa-house"></i>
                        Dashboard
                    </button>

                    <button
                        data-view="deposit"
                    >
                        <i class="fa-solid fa-arrow-down"></i>
                        Vklad / Výběr
                    </button>

                    <button
                        data-view="transactions"
                    >
                        <i class="fa-solid fa-arrow-right-arrow-left"></i>
                        Transakce
                    </button>

                    <button
                        data-view="transfer"
                    >
                        <i class="fa-solid fa-right-left"></i>
                        Převod
                    </button>

                </nav>

                <div class="side-bottom">

                    <div class="side-card">
                        <strong>
                            ⌘ &nbsp; Změnit PIN
                        </strong>

                        BEZPEČNOSTNÍ ÚDAJE
                    </div>

                    <div class="side-card">
                        <strong>
                            ✓ &nbsp; SECURE BANKING
                        </strong>

                        DFScripts Financial
                    </div>

                </div>

            </aside>

            <main class="main">

                <header class="topbar">

                    <div class="account-select">
                        $ &nbsp; Osobní účet

                        <small>
                            FLECCA BANK
                        </small>
                    </div>

                    <div class="balance-box">

                        <small>
                            ACCOUNT BALANCE
                        </small>

                        <strong id="balance">
                            $46,000
                        </strong>

                        <span>
                            ● ACTIVE ACCOUNT
                        </span>

                    </div>

                </header>

                <div class="content">

                    <section
                        class="view active"
                        id="overview"
                    >

                        <div class="welcome">
                            Vítejte zpět,
                            &nbsp;
                            <b>
                                Dejv Dev
                            </b>
                        </div>

                        <div class="stats">

                            <div class="stat">
                                <small>
                                    CELKOVÉ PŘÍJMY
                                </small>

                                <strong>
                                    +$1,113
                                </strong>

                                <span class="stat-icon">
                                    ↗
                                </span>
                            </div>

                            <div class="stat">
                                <small>
                                    CELKOVÉ VÝDAJE
                                </small>

                                <strong>
                                    -$1,113
                                </strong>

                                <span class="stat-icon">
                                    ↗
                                </span>
                            </div>

                        </div>

                        <div class="middle">

                            <div class="panel">

                                <div class="panel-head">

                                    <div>
                                        <h2>
                                            Finanční aktivita
                                        </h2>

                                        <p>
                                            Přehled pohybu financí
                                        </p>
                                    </div>

                                    <span
                                        class="chart-value"
                                        id="chartBalance"
                                    >
                                        $46,000
                                    </span>

                                </div>

                                <div class="chart">

                                    <svg
                                        viewBox="0 0 700 160"
                                        preserveAspectRatio="none"
                                        aria-hidden="true"
                                    >

                                        <defs>

                                            <linearGradient
                                                id="area"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="0"
                                                    stop-color="#8d3d67"
                                                    stop-opacity=".35"
                                                />

                                                <stop
                                                    offset="1"
                                                    stop-color="#8d3d67"
                                                    stop-opacity="0"
                                                />
                                            </linearGradient>

                                        </defs>

                                        <path
                                            d="M0 102 L65 102 L125 102 L185 104 L245 101 L305 105 L365 99 L425 101 L485 94 L545 96 L605 55 L700 40 L700 160 L0 160Z"
                                            fill="url(#area)"
                                        />

                                        <path
                                            d="M0 102 L65 102 L125 102 L185 104 L245 101 L305 105 L365 99 L425 101 L485 94 L545 96 L605 55 L700 40"
                                            fill="none"
                                            stroke="#9d4c7c"
                                            stroke-width="2"
                                        />

                                        <g
                                            fill="#0e0c12"
                                            stroke="#a95a88"
                                            stroke-width="1.5"
                                        >
                                            <circle
                                                cx="65"
                                                cy="102"
                                                r="3"
                                            />

                                            <circle
                                                cx="125"
                                                cy="102"
                                                r="3"
                                            />

                                            <circle
                                                cx="185"
                                                cy="104"
                                                r="3"
                                            />

                                            <circle
                                                cx="245"
                                                cy="101"
                                                r="3"
                                            />

                                            <circle
                                                cx="305"
                                                cy="105"
                                                r="3"
                                            />

                                            <circle
                                                cx="365"
                                                cy="99"
                                                r="3"
                                            />

                                            <circle
                                                cx="425"
                                                cy="101"
                                                r="3"
                                            />

                                            <circle
                                                cx="485"
                                                cy="94"
                                                r="3"
                                            />

                                            <circle
                                                cx="545"
                                                cy="96"
                                                r="3"
                                            />

                                            <circle
                                                cx="605"
                                                cy="55"
                                                r="3"
                                            />
                                        </g>

                                    </svg>

                                </div>

                            </div>

                            <div class="panel">

                                <h2>
                                    Rychlé akce
                                </h2>

                                <p>
                                    Správa financí
                                </p>

                                <div class="actions">

                                    <button
                                        class="quick"
                                        data-open="deposit"
                                    >
                                        ↗ &nbsp;
                                        <b>
                                            Vložit hotovost
                                        </b>
                                    </button>

                                    <button
                                        class="quick"
                                        data-open="withdraw"
                                    >
                                        ↗ &nbsp;
                                        <b>
                                            Vybrat hotovost
                                        </b>
                                    </button>

                                </div>

                                <button
                                    class="transfer"
                                    data-open="transfer"
                                >
                                    Převést peníze
                                    &nbsp; →
                                </button>

                            </div>

                        </div>

                        <div class="panel transactions">

                            <div class="panel-head">

                                <div>
                                    <h2>
                                        Poslední transakce
                                    </h2>

                                    <p>
                                        Aktivita na účtu
                                    </p>
                                </div>

                                <span class="eyebrow">
                                    Zobrazit více
                                </span>

                            </div>

                            <div id="transactionsList"></div>

                        </div>

                    </section>

                    <section
                        class="view"
                        id="deposit"
                    >
                        <h2>
                            Vklad hotovosti
                        </h2>

                        <p class="notice">
                            Demo akce – upravuje pouze lokální demo zůstatek.
                        </p>

                        <div class="form">

                            <label>
                                ČÁSTKA
                            </label>

                            <input
                                id="depositAmount"
                                type="number"
                                min="1"
                                placeholder="1000"
                            >

                            <button
                                class="submit"
                                data-submit="deposit"
                            >
                                VLOŽIT HOTOVOST
                            </button>

                        </div>
                    </section>

                    <section
                        class="view"
                        id="withdraw"
                    >
                        <h2>
                            Výběr hotovosti
                        </h2>

                        <p class="notice">
                            Demo akce – upravuje pouze lokální demo zůstatek.
                        </p>

                        <div class="form">

                            <label>
                                ČÁSTKA
                            </label>

                            <input
                                id="withdrawAmount"
                                type="number"
                                min="1"
                                placeholder="1000"
                            >

                            <button
                                class="submit"
                                data-submit="withdraw"
                            >
                                VYBRAT HOTOVOST
                            </button>

                        </div>
                    </section>

                    <section
                        class="view"
                        id="transactions"
                    >
                        <h2>
                            Transakce
                        </h2>

                        <p class="notice">
                            Přehled demo transakcí.
                        </p>

                        <div class="panel transactions">
                            <div id="transactionsList2"></div>
                        </div>
                    </section>

                    <section
                        class="view"
                        id="transfer"
                    >
                        <h2>
                            Převod peněz
                        </h2>

                        <p class="notice">
                            Toto je pouze browser demo. Žádné skutečné FiveM peníze se nepoužívají.
                        </p>

                        <div class="form">

                            <label>
                                PŘÍJEMCE
                            </label>

                            <input
                                id="recipient"
                                placeholder="Player_123"
                            >

                            <label>
                                ČÁSTKA
                            </label>

                            <input
                                id="transferAmount"
                                type="number"
                                min="1"
                                placeholder="500"
                            >

                            <button
                                class="submit"
                                data-submit="transfer"
                            >
                                PŘEVÉST PENÍZE
                            </button>

                        </div>
                    </section>

                </div>

            </main>

        </div>

        <div
            class="toast"
            id="toast"
        ></div>
    `;

    let balance =
        46000;

    let tx = [
        {
            name:
                "deposit",
            meta:
                "deposit_cash",
            amount:
                1111
        },

        {
            name:
                "withdrawal",
            meta:
                "withdraw_cash",
            amount:
                -1111
        },

        {
            name:
                "deposit",
            meta:
                "deposit_cash",
            amount:
                1
        },

        {
            name:
                "withdrawal",
            meta:
                "withdraw_cash",
            amount:
                -1
        }
    ];

    const money =
        n =>
            "$" +
            Number(n)
                .toLocaleString(
                    "en-US",
                    {
                        maximumFractionDigits:
                            0
                    }
                );

    const renderTx =
        list =>
            list
                .map(
                    t => `
                        <div class="tx">

                            <div class="tx-left">

                                <div class="tx-icon">
                                    ${
                                        t.amount >
                                        0
                                            ? "+"
                                            : "−"
                                    }
                                </div>

                                <div>
                                    <b>
                                        ${escapeHtml(
                                            t.name
                                        )}
                                    </b>

                                    <small>
                                        ${escapeHtml(
                                            t.meta
                                        )}
                                    </small>
                                </div>

                            </div>

                            <b
                                class="${
                                    t.amount >
                                    0
                                        ? "plus"
                                        : "minus"
                                }"
                            >
                                ${
                                    t.amount >
                                    0
                                        ? "+"
                                        : "−"
                                }${money(
                                    Math.abs(
                                        t.amount
                                    )
                                )}
                            </b>

                        </div>
                    `
                )
                .join("");

    function render() {
        root.querySelector(
            "#balance"
        ).textContent =
            money(balance);

        root.querySelector(
            "#chartBalance"
        ).textContent =
            money(balance);

        root.querySelector(
            "#transactionsList"
        ).innerHTML =
            renderTx(
                tx.slice(
                    0,
                    6
                )
            );

        root.querySelector(
            "#transactionsList2"
        ).innerHTML =
            renderTx(tx);
    }

    function toast(
        message
    ) {
        const el =
            root.querySelector(
                "#toast"
            );

        el.textContent =
            message;

        el.classList.add(
            "show"
        );

        clearTimeout(
            el._t
        );

        el._t =
            setTimeout(
                () =>
                    el.classList.remove(
                        "show"
                    ),
                1800
            );
    }

    function openView(id) {
        root
            .querySelectorAll(
                ".view"
            )
            .forEach(
                view => {
                    view.classList.toggle(
                        "active",
                        view.id ===
                            id
                    );
                }
            );

        root
            .querySelectorAll(
                "[data-view]"
            )
            .forEach(
                button => {
                    button.classList.toggle(
                        "active",
                        button.dataset.view ===
                            id
                    );
                }
            );
    }

    root.addEventListener(
        "click",
        event => {
            const nav =
                event.target.closest(
                    "[data-view]"
                );

            const open =
                event.target.closest(
                    "[data-open]"
                );

            const submit =
                event.target.closest(
                    "[data-submit]"
                );

            if (nav) {
                openView(
                    nav.dataset.view
                );
            }

            if (open) {
                openView(
                    open.dataset.open
                );
            }

            if (!submit) {
                return;
            }

            const type =
                submit.dataset.submit;

            const input =
                root.querySelector(
                    `#${type}Amount`
                );

            const amount =
                Number(
                    input?.value
                );

            if (
                !amount ||
                amount <= 0
            ) {
                return toast(
                    "Zadej platnou částku."
                );
            }

            if (
                (
                    type ===
                        "withdraw" ||
                    type ===
                        "transfer"
                ) &&
                amount >
                    balance
            ) {
                return toast(
                    "Nedostatečný demo zůstatek."
                );
            }

            balance +=
                type ===
                "deposit"
                    ? amount
                    : -amount;

            tx.unshift({
                name:
                    type ===
                    "deposit"
                        ? "deposit"
                        : type ===
                          "withdraw"
                            ? "withdrawal"
                            : "transfer",

                meta:
                    type +
                    "_cash",

                amount:
                    type ===
                    "deposit"
                        ? amount
                        : -amount
            });

            if (input) {
                input.value =
                    "";
            }

            render();

            openView(
                "overview"
            );

            toast(
                "Demo transakce provedena."
            );
        }
    );

    render();

    host.dataset.mounted =
        "true";
}

function setupBankingDemoLinks() {
    const modal =
        $("#bankingDemoModal");

    if (!modal) {
        return;
    }

    const openDemo =
        event => {
            event.preventDefault();

            mountBankingDemo();

            modal.classList.add(
                "is-open"
            );

            modal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "banking-demo-open"
            );
        };

    const closeDemo =
        () => {
            modal.classList.remove(
                "is-open"
            );

            modal.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "banking-demo-open"
            );
        };

    $$(
        "[data-banking-demo]"
    ).forEach(
        link => {
            if (
                link.dataset.bankingDemoReady ===
                "true"
            ) {
                return;
            }

            link.dataset.bankingDemoReady =
                "true";

            link.addEventListener(
                "click",
                openDemo
            );
        }
    );

    $$(
        "[data-banking-demo-close]"
    ).forEach(
        button => {
            button.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    closeDemo();
                }
            );
        }
    );

    modal.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                modal
            ) {
                closeDemo();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                    "Escape" &&
                modal.classList.contains(
                    "is-open"
                )
            ) {
                closeDemo();
            }
        }
    );
}


function setupHomeBanner() {
    const home = document.getElementById("home");

    if (!home || document.getElementById("dfsHomeBanner")) {
        return;
    }

    const banner = document.createElement("div");
    banner.id = "dfsHomeBanner";
    banner.className = "dfs-home-banner";
    banner.innerHTML = `
        <img
            src="/images/banner.png"
            alt="DFS Scripts"
            loading="eager"
            decoding="async"
        >
    `;

    const image = banner.querySelector("img");

    image.addEventListener("error", () => {
        banner.remove();
        console.warn("DFS banner not found: /images/banner.png");
    });

    const firstChild = home.firstElementChild;

    if (firstChild) {
        home.insertBefore(banner, firstChild);
    } else {
        home.appendChild(banner);
    }

    if (!document.getElementById("dfsHomeBannerStyles")) {
        const style = document.createElement("style");
        style.id = "dfsHomeBannerStyles";
        style.textContent = `
            #dfsHomeBanner {
                width: 100%;
                max-width: 1400px;
                margin: 0 auto 28px;
                overflow: hidden;
                border-radius: 16px;
                border: 1px solid rgba(155, 75, 126, .22);
                background: #0b090d;
                box-shadow: 0 18px 50px rgba(0, 0, 0, .35);
            }

            #dfsHomeBanner img {
                display: block;
                width: 100%;
                height: auto;
                max-height: 420px;
                object-fit: cover;
            }

            @media (max-width: 800px) {
                #dfsHomeBanner {
                    margin-bottom: 20px;
                    border-radius: 12px;
                }

                #dfsHomeBanner img {
                    max-height: 260px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function init() {
    refreshAuthElements();

    setupDiscordLogin();

    addDynamicStyles();

    setupHomeBanner();

    updateYear();

    setupMobileMenu();

    setupCart();

    setupCartDelegation();

    setupDiscordProfile();

    setupPopups();

    setupSearch();

    setupNavigation();

    setupFAQ();

    setupScrollReveal();

    setupProductHover();

    setupProductClickFallback();

    setupProductModalsFixed();

    setupBankingDemoLinks();

    setupKeyboardShortcuts();

    handleDiscordError();

    renderCart();

    updateCartUI();

    loadDiscordUser();
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        init
    );
} else {
    init();
}